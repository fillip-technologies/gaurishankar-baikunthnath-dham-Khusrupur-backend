import { transporter } from "../../../configs/mail.config.js";
import { envConfig } from "../../../configs/env.config.js";
import logger from "../../../utils/logger.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";
import { PoojaBooking } from "../models/poojaBooking.model.js";
import { RoomBooking } from "../models/roomBooking.model.js";
import { bookingReceiptTemplate } from "../../../templates/bookingReceipt.template.js";
import { generateBookingInvoice } from "../utils/generateBookingInvoice.js";

const formatIST = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * Universal Booking Receipt Sender.
 * Sends a receipt email + downloadable PDF invoice for ANY booking type
 * (Prasad, Pooja, Darshan, Seva, Event, etc.).
 *
 * @param {Object} options
 * @param {string} options.to - Devotee / recipient email address
 * @param {string} [options.name] - Devotee / payer name
 * @param {string} [options.phone] - Devotee phone number
 * @param {string} [options.address] - Devotee address
 * @param {string} options.bookingId - Unique booking ID
 * @param {string} [options.paymentId] - Gateway payment ID
 * @param {string} [options.bookingType="Booking"] - Type of booking (e.g. "Prasad", "Pooja", "Seva")
 * @param {string} [options.subject] - Custom email subject
 * @param {string} [options.templeName="Shree Gaurishankar Baikunthdham Temple"] - Temple branding
 * @param {string} [options.greeting] - Invocation / greeting line
 * @param {string} [options.message] - Custom body message
 * @param {number|string} options.amountRupees - Total amount paid in INR
 * @param {string} [options.bookingTime] - Formatted date/time
 * @param {Array<Object>} [options.items] - Line items
 * @param {Array<Object>} [options.details] - Key-value metadata details
 * @param {string} [options.attachmentFilename] - Custom attachment filename
 * @returns {Promise<Object|void>}
 */
export const sendBookingReceiptService = async (options = {}) => {
  const {
    to,
    email,
    name = "Devotee",
    phone,
    address,
    bookingId,
    paymentId,
    bookingType = "Booking",
    subject,
    templeName = "Shree Gaurishankar Baikunthdham Temple",
    greeting,
    message,
    amountRupees,
    bookingTime,
    items = [],
    details = [],
    attachmentFilename,
    ...rest
  } = options;

  const recipientEmail = to || email;
  if (!recipientEmail) {
    logger.warn(
      { bookingId: String(bookingId), bookingType },
      "Booking receipt has no recipient email; skipping email dispatch",
    );
    return;
  }

  const effectiveBookingTime = bookingTime || formatIST(new Date());
  const effectiveSubject =
    subject || `Your ${bookingType} Booking Receipt - ${templeName}`;
  const filename =
    attachmentFilename ||
    `${(bookingType || "booking").toLowerCase()}-invoice-${bookingId || Date.now()}.pdf`;

  // Generate PDF Invoice
  const pdfBuffer = await generateBookingInvoice({
    bookingId,
    paymentId,
    bookingType,
    templeName,
    name,
    email: recipientEmail,
    phone,
    address,
    bookingTime: effectiveBookingTime,
    amountRupees,
    items,
    details,
    ...rest,
  });

  // Generate HTML Email
  const htmlContent = bookingReceiptTemplate({
    name,
    bookingType,
    templeName,
    greeting,
    message,
    bookingId,
    bookingTime: effectiveBookingTime,
    paymentId,
    amountRupees,
    items,
    details,
    ...rest,
  });

  // Send Email
  const info = await transporter.sendMail({
    from: `"${templeName}" <${envConfig.MAIL_FROM}>`,
    to: recipientEmail,
    subject: effectiveSubject,
    html: htmlContent,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  logger.info(
    { bookingId: String(bookingId), bookingType, to: recipientEmail },
    `${bookingType} booking receipt emailed successfully`,
  );

  return info;
};

/**
 * Emails a prasad booking receipt + downloadable PDF invoice — exactly once.
 * Wraps `sendBookingReceiptService` with atomic idempotency claims.
 *
 * @param {string} bookingId - PrasadBooking document ID
 */
export const sendPrasadReceiptService = async (bookingId) => {
  // Atomically claim the send: succeeds only for a confirmed booking whose
  // receipt has not been sent yet.
  const booking = await PrasadBooking.findOneAndUpdate(
    { _id: bookingId, status: "confirmed", receiptSentAt: null },
    { $set: { receiptSentAt: new Date() } },
    { returnDocument: "after" },
  )
    .populate("prasad", "prasadName pricePerKg")
    .populate("payment", "payer razorpayPaymentId");

  // Already sent by the other path, not confirmed, or gone → nothing to do.
  if (!booking) return;

  try {
    const { prasad, payment, quantity, amount, createdAt } = booking;
    const payer = payment?.payer || {};

    if (!payer.email) {
      logger.warn(
        { bookingId: String(bookingId) },
        "Prasad booking has no payer email; skipping receipt",
      );
      // Defensive: release the claim in case the data is later corrected.
      await PrasadBooking.findByIdAndUpdate(bookingId, { receiptSentAt: null });
      return;
    }

    const amountRupees = amount / 100;
    const bookingTime = formatIST(createdAt);

    await sendBookingReceiptService({
      to: payer.email,
      name: payer.name,
      phone: payer.phone,
      bookingId: String(booking._id),
      paymentId: payment?.razorpayPaymentId,
      bookingType: "Prasad",
      prasadName: prasad?.prasadName,
      pricePerKg: prasad?.pricePerKg,
      quantity,
      amountRupees,
      bookingTime,
    });
  } catch (error) {
    logger.error(
      { err: error, bookingId: String(bookingId) },
      "Failed to send prasad booking receipt",
    );
    // Release the claim so a subsequent confirmation path can retry.
    await PrasadBooking.findByIdAndUpdate(bookingId, {
      receiptSentAt: null,
    }).catch(() => {});
  }
};

/**
 * Emails a pooja booking receipt + downloadable PDF invoice — exactly once.
 * Wraps `sendBookingReceiptService` with atomic idempotency claims.
 *
 * @param {string} bookingId - PoojaBooking document ID
 */
export const sendPoojaReceiptService = async (bookingId) => {
  // Atomically claim the send: succeeds only for a confirmed booking whose
  // receipt has not been sent yet.
  const booking = await PoojaBooking.findOneAndUpdate(
    { _id: bookingId, status: "confirmed", receiptSentAt: null },
    { $set: { receiptSentAt: new Date() } },
    { returnDocument: "after" },
  )
    .populate("pooja", "poojaName price")
    .populate("payment", "payer razorpayPaymentId");

  // Already sent by the other path, not confirmed, or gone → nothing to do.
  if (!booking) return;

  try {
    const { pooja, payment, quantity, amount, createdAt, bookingDate } = booking;
    // Online bookings carry the payer on the linked Payment; manual (counter)
    // bookings have no Payment and keep the payer snapshot on the booking itself.
    const payer = payment?.payer || booking.payer || {};

    if (!payer.email) {
      logger.warn(
        { bookingId: String(bookingId) },
        "Pooja booking has no payer email; skipping receipt",
      );
      // Defensive: release the claim in case the data is later corrected.
      await PoojaBooking.findByIdAndUpdate(bookingId, { receiptSentAt: null });
      return;
    }

    const amountRupees = amount / 100;
    const bookingTime = formatIST(createdAt);

    await sendBookingReceiptService({
      to: payer.email,
      name: payer.name,
      phone: payer.phone,
      bookingId: String(booking._id),
      paymentId: payment?.razorpayPaymentId,
      bookingType: "Pooja",
      // `itemName`/`unitPrice` are the fields the invoice PDF + email template
      // understand (poojaName/price are ignored by both), so the pooja name and
      // per-unit price render as a proper line item.
      itemName: pooja?.poojaName,
      itemLabel: "Pooja",
      unitPrice: pooja?.price,
      quantity,
      amountRupees,
      bookingTime,
      details: bookingDate
        ? [
            {
              label: "Pooja Date",
              value: new Date(bookingDate).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
              }),
            },
          ]
        : [],
    });
  } catch (error) {
    logger.error(
      { err: error, bookingId: String(bookingId) },
      "Failed to send pooja booking receipt",
    );
    // Release the claim so a subsequent confirmation path can retry.
    await PoojaBooking.findByIdAndUpdate(bookingId, {
      receiptSentAt: null,
    }).catch(() => {});
  }
};

/**
 * Emails a room booking receipt + downloadable PDF invoice — exactly once.
 * Wraps `sendBookingReceiptService` with atomic idempotency claims.
 *
 * @param {string} bookingId - RoomBooking document ID
 */
export const sendRoomReceiptService = async (bookingId) => {
  // Atomically claim the send: succeeds only for a confirmed booking whose
  // receipt has not been sent yet.
  const booking = await RoomBooking.findOneAndUpdate(
    { _id: bookingId, status: "confirmed", receiptSentAt: null },
    { $set: { receiptSentAt: new Date() } },
    { returnDocument: "after" },
  )
    .populate("room", "roomType price")
    .populate("payment", "payer razorpayPaymentId");

  // Already sent by the other path, not confirmed, or gone → nothing to do.
  if (!booking) return;

  try {
    const { room, payment, quantity, amount, createdAt } = booking;
    const payer = payment?.payer || {};

    if (!payer.email) {
      logger.warn(
        { bookingId: String(bookingId) },
        "Room booking has no payer email; skipping receipt",
      );
      // Defensive: release the claim in case the data is later corrected.
      await RoomBooking.findByIdAndUpdate(bookingId, { receiptSentAt: null });
      return;
    }

    const amountRupees = amount / 100;
    const bookingTime = formatIST(createdAt);

    await sendBookingReceiptService({
      to: payer.email,
      name: payer.name,
      phone: payer.phone,
      bookingId: String(booking._id),
      paymentId: payment?.razorpayPaymentId,
      bookingType: "Room",
      itemName: room?.roomType,
      itemLabel: "Room Type",
      unitPrice: room?.price,
      unitPriceLabel: "Price / room",
      quantity,
      unitLabel: "room(s)",
      amountRupees,
      bookingTime,
    });
  } catch (error) {
    logger.error(
      { err: error, bookingId: String(bookingId) },
      "Failed to send room booking receipt",
    );
    // Release the claim so a subsequent confirmation path can retry.
    await RoomBooking.findByIdAndUpdate(bookingId, {
      receiptSentAt: null,
    }).catch(() => {});
  }
};
