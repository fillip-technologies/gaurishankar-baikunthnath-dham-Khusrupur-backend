import { transporter } from "../../../configs/mail.config.js";
import { envConfig } from "../../../configs/env.config.js";
import logger from "../../../utils/logger.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";
import { prasadReceiptTemplate } from "../../../templates/prasadReceipt.template.js";
import { generatePrasadInvoice } from "../utils/generatePrasadInvoice.js";

const formatIST = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * Emails a prasad booking receipt + downloadable PDF invoice — exactly once.
 *
 * Both the interactive /verify route and the Razorpay webhook subscriber confirm
 * a booking and call this. The atomic claim on `receiptSentAt` (null → now)
 * guarantees only the first caller sends; the loser is a silent no-op.
 *
 * Best-effort by design: it never throws, so a mail/PDF failure can't roll back
 * a booking the devotee has already paid for. On failure the claim is released
 * so a later confirmation path can retry. (Crash gap: if the process dies after
 * claiming but before sending, no receipt goes out — an accepted trade-off for a
 * non-critical receipt rather than a full retry queue.)
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

    const invoiceFields = {
      bookingId: String(booking._id),
      paymentId: payment?.razorpayPaymentId,
      name: payer.name,
      email: payer.email,
      phone: payer.phone,
      prasadName: prasad?.prasadName,
      pricePerKg: prasad?.pricePerKg,
      quantity,
      amountRupees,
      bookingTime,
    };

    const pdfBuffer = await generatePrasadInvoice(invoiceFields);

    await transporter.sendMail({
      from: `"Shree Gaurishankar Baikunthdham Temple" <${envConfig.MAIL_FROM}>`,
      to: payer.email,
      subject:
        "Your Prasad Booking Receipt - Shree Gaurishankar Baikunthdham Temple",
      html: prasadReceiptTemplate({
        name: payer.name,
        prasadName: prasad?.prasadName,
        pricePerKg: prasad?.pricePerKg,
        quantity,
        amountRupees,
        bookingTime,
        bookingId: String(booking._id),
      }),
      attachments: [
        {
          filename: `prasad-invoice-${booking._id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    logger.info(
      { bookingId: String(booking._id) },
      "Prasad booking receipt emailed",
    );
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
