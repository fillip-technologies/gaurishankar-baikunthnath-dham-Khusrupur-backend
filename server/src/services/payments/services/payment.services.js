import crypto from "crypto";

import razorpay from "../../../configs/razorpay.config.js";
import { envConfig } from "../../../configs/env.config.js";
import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import logger from "../../../utils/logger.js";
import { Payment } from "../models/payment.model.js";
import { PaymentAudit } from "../models/paymentAudit.model.js";
import { paymentEvents, PAYMENT_EVENTS } from "../events/payment.events.js";

// Fire-and-forget audit trail. A failure to write the audit log must never break
// the payment flow itself, so we swallow (and log) any error here.
const writeAudit = async ({
  payment,
  action,
  previousStatus = null,
  newStatus = null,
  razorpayOrderId = null,
  razorpayPaymentId = null,
  amount,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await PaymentAudit.create({
      payment,
      action,
      previousStatus,
      newStatus,
      razorpayOrderId,
      razorpayPaymentId,
      amount,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to write payment audit log");
  }
};

// Notifies subscribers (booking, donation, …) of a settled payment. Wrapped so a
// throwing listener can never break the payment flow.
const emitPaymentEvent = (event, payment) => {
  try {
    paymentEvents.emit(event, { payment });
  } catch (error) {
    logger.error({ err: error, event }, "Payment event listener threw");
  }
};

/**
 * Creates a Razorpay order and the matching Payment record. This is the reusable
 * entry point any service can call in-process — a booking controller passes the
 * booking id as `reference`, a standalone donation omits it, and so on.
 *
 * @param {object}  args
 * @param {number}  args.amount     Smallest currency unit (paise for INR).
 * @param {string} [args.currency]  ISO 4217 code, defaults to "INR".
 * @param {object} [args.payer]     { name, email, phone } snapshot.
 * @param {string} [args.purpose]   "booking" | "donation" | "general".
 * @param {object} [args.reference] { model, id } of the owning domain document.
 * @param {object} [args.notes]     Passthrough key/value notes.
 */
export const createOrderService = async ({
  amount,
  currency = "INR",
  payer = {},
  purpose = "general",
  reference = null,
  notes = {},
  ipAddress = null,
  userAgent = null,
}) => {
  let order;
  try {
    order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        ...notes,
        purpose,
        ...(reference
          ? {
              referenceModel: reference.model,
              referenceId: String(reference.id),
            }
          : {}),
        ...(payer?.email ? { email: payer.email } : {}),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Razorpay order creation failed");
    throw new ApiError(
      HTTP_STATUS.BAD_GATEWAY,
      "Failed to create payment order",
    );
  }

  const payment = await Payment.create({
    amount,
    currency,
    payer,
    purpose,
    reference: reference
      ? { model: reference.model, id: reference.id }
      : undefined,
    razorpayOrderId: order.id,
    status: "created",
  });

  await writeAudit({
    payment: payment._id,
    action: "created",
    newStatus: "created",
    razorpayOrderId: order.id,
    amount,
    metadata: { receipt: order.receipt, purpose, notes },
    ipAddress,
    userAgent,
  });

  // key_id is safe to expose to the client for the Checkout handshake.
  return {
    key: envConfig.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id,
    payer: payment.payer,
  };
};

export const verifyPaymentService = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  ipAddress,
  userAgent,
}) => {
  const payment = await Payment.findOne({ razorpayOrderId });

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment order not found");
  }

  const expectedSignature = crypto
    .createHmac("sha256", envConfig.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const signatureValid =
    expectedSignature.length === razorpaySignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature),
    );

  const previousStatus = payment.status;

  if (!signatureValid) {
    payment.status = "failed";
    await payment.save();

    await writeAudit({
      payment: payment._id,
      action: "failed",
      previousStatus,
      newStatus: "failed",
      razorpayOrderId,
      razorpayPaymentId,
      amount: payment.amount,
      metadata: { reason: "signature_mismatch" },
      ipAddress,
      userAgent,
    });

    emitPaymentEvent(PAYMENT_EVENTS.FAILED, payment);

    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid payment signature");
  }

  payment.status = "successful";
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();

  await writeAudit({
    payment: payment._id,
    action: "successful",
    previousStatus,
    newStatus: "successful",
    razorpayOrderId,
    razorpayPaymentId,
    amount: payment.amount,
    ipAddress,
    userAgent,
  });

  emitPaymentEvent(PAYMENT_EVENTS.SUCCEEDED, payment);

  return {
    paymentId: payment._id,
    status: payment.status,
    razorpayOrderId,
    razorpayPaymentId,
  };
};

// Verifies the webhook signature against the raw request body and reconciles the
// payment status. Razorpay is the source of truth here, so this catches cases the
// client-side verify call missed (e.g. the user closing the tab after paying).
export const handleWebhookService = async ({ rawBody, signature }) => {
  if (!envConfig.RAZORPAY_WEBHOOK_SECRET) {
    logger.error("RAZORPAY_WEBHOOK_SECRET is not configured");
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Webhook not configured",
    );
  }

  if (!rawBody || !signature) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid webhook payload");
  }

  const expectedSignature = crypto
    .createHmac("sha256", envConfig.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const signatureValid =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );

  if (!signatureValid) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid webhook signature");
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const entity = event?.payload?.payment?.entity;
  const orderId = entity?.order_id;

  if (!orderId) {
    // Nothing we track (e.g. a payout event) — acknowledge and move on.
    return { received: true };
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    logger.warn({ orderId }, "Webhook for unknown payment order");
    return { received: true };
  }

  const eventToStatus = {
    "payment.captured": "successful",
    "payment.failed": "failed",
    "refund.processed": "refunded",
  };
  const nextStatus = eventToStatus[event.event];

  // Ignore events that don't map to a status change, and never regress a payment
  // that is already settled to the same state.
  if (!nextStatus || payment.status === nextStatus) {
    return { received: true };
  }

  const previousStatus = payment.status;
  payment.status = nextStatus;
  if (entity?.id) payment.razorpayPaymentId = entity.id;
  await payment.save();

  await writeAudit({
    payment: payment._id,
    action: nextStatus === "successful" ? "successful" : nextStatus,
    previousStatus,
    newStatus: nextStatus,
    razorpayOrderId: orderId,
    razorpayPaymentId: entity?.id ?? null,
    amount: payment.amount,
    metadata: { source: "webhook", event: event.event },
  });

  const statusToEvent = {
    successful: PAYMENT_EVENTS.SUCCEEDED,
    failed: PAYMENT_EVENTS.FAILED,
    refunded: PAYMENT_EVENTS.REFUNDED,
  };
  emitPaymentEvent(statusToEvent[nextStatus], payment);

  return { received: true };
};

export const getPaymentByIdService = async ({ paymentId }) => {
  const payment = await Payment.findById(paymentId).lean();

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found");
  }

  return payment;
};

export const getAllPaymentService = async () => {
  const payment = await Payment.find().sort({ createdAt: -1 });
  if (!payment) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found");
  if (payment.length <= 0)
    return res.status(HTTP_STATUS.NO_CONTENT, "No paymnet to show");
  return payment;
};
