// One-off: send a sample prasad booking receipt (email + PDF invoice) to a given
// address, using the exact template + invoice generator the real booking flow
// uses. Run: node scripts/sendSampleReceipt.js <email>
import { transporter } from "../src/configs/mail.config.js";
import { envConfig } from "../src/configs/env.config.js";
import { prasadReceiptTemplate } from "../src/templates/prasadReceipt.template.js";
import { generatePrasadInvoice } from "../src/services/bookings/utils/generatePrasadInvoice.js";

const to = process.argv[2] || "myselfgovind116@gmail.com";

const bookingTime = new Date().toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

const data = {
  bookingId: "SAMPLE-" + Date.now(),
  paymentId: "pay_SAMPLE123",
  name: "Govind Kumar",
  email: to,
  phone: "9876543210",
  prasadName: "Panchamrit Prasad",
  pricePerKg: 250,
  quantity: 2,
  amountRupees: 500,
  bookingTime,
};

const pdfBuffer = await generatePrasadInvoice(data);

const info = await transporter.sendMail({
  from: `"Shree Gaurishankar Baikunthdham Temple" <${envConfig.MAIL_FROM}>`,
  to,
  subject:
    "Your Prasad Booking Receipt - Shree Gaurishankar Baikunthdham Temple",
  html: prasadReceiptTemplate(data),
  attachments: [
    {
      filename: `prasad-invoice-${data.bookingId}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ],
});

console.log("Sent to", to, "| messageId:", info.messageId);
process.exit(0);
