import { paymentEvents, PAYMENT_EVENTS } from "../events/payment.events.js";
import { transporter } from "../../../configs/mail.config.js";
import { envConfig } from "../../../configs/env.config.js";
import { donationReceiptTemplate } from "../../../templates/donationReceipt.template.js";
import logger from "../../../utils/logger.js";

const toRupees = (paise) => Math.round((Number(paise) || 0) / 100);

paymentEvents.on(PAYMENT_EVENTS.SUCCEEDED, async ({ payment }) => {
  if (payment?.purpose !== "donation") return;

  const email = payment.payer?.email;
  if (!email) {
    logger.warn(
      { paymentId: payment._id },
      "Donation payment has no payer email — skipping receipt",
    );
    return;
  }

  const amountRupees = toRupees(payment.amount);

  const html = donationReceiptTemplate({
    name: payment.payer?.name || "Devotee",
    amountRupees,
    cause: payment.notes?.cause || "General Donation",
    paymentId: payment.razorpayPaymentId || String(payment._id),
    donationDate:
      payment.notes?.donationDate ||
      new Date(payment.createdAt).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
      }),
    pan: payment.notes?.pan || "",
    city: payment.notes?.city || "",
    state: payment.notes?.state || "",
    email,
    phone: payment.payer?.phone || "",
  });

  try {
    await transporter.sendMail({
      from: `"Shree Gaurishankar Baikunthdham Temple" <${envConfig.MAIL_FROM}>`,
      to: email,
      subject: `🙏 Donation Receipt — ${`₹${amountRupees.toLocaleString("en-IN")}`} · Shree Gaurishankar Baikunthdham Temple`,
      html,
    });
    logger.info(
      { paymentId: payment._id, email },
      "Donation receipt email sent",
    );
  } catch (error) {
    logger.error(
      { err: error, paymentId: payment._id, email },
      "Failed to send donation receipt email",
    );
  }
});
