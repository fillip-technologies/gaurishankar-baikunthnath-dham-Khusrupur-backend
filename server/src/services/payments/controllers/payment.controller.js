import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import {
  createOrderService,
  verifyPaymentService,
  handleWebhookService,
  getPaymentByIdService,
} from "../services/payment.services.js";
import ApiError from "../../../utils/ApiError.js";

export const createOrder = asyncHandler(async (req, res) => {
  const { payer, amount, currency, purpose, reference, notes } =
    req.validated.body;

  const result = await createOrderService({
    payer,
    amount,
    currency,
    purpose,
    reference,
    notes,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, "Order created"));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.validated.body;

  const result = await verifyPaymentService({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, "Payment verified"));
});

// Public endpoint hit by Razorpay's servers. Authenticity is proven by the
// x-razorpay-signature header rather than a session cookie.
export const handleWebhook = asyncHandler(async (req, res) => {
  const result = await handleWebhookService({
    rawBody: req.rawBody,
    signature: req.get("x-razorpay-signature"),
  });

  return res.status(HTTP_STATUS.OK).json(result);
});

export const getPayment = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superadmin" && user.role !== "accountant")
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "You are unauthorized");

  const { id } = req.params;

  const payment = await getPaymentByIdService({ paymentId: id });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, payment, "Payment fetched"));
});

export const getAllPayment = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superadmin" && user.role !== "accountant")
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "You are unauthorized");

  const payment = await getAllPaymentService();
  return res.status(HTTP_STATUS.OK, payment, "All payments");
});
