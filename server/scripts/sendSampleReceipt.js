// One-off: send a sample universal booking receipt (email + PDF invoice) to a given
// address, using the exact template + invoice generator the real booking flow
// uses. Run: node scripts/sendSampleReceipt.js <email> [prasad|pooja|seva]
import { sendBookingReceiptService } from "../src/services/bookings/services/bookingReceipt.service.js";

const to = process.argv[2] || "myselfgovind116@gmail.com";
const type = process.argv[3] || "prasad";

const bookingTime = new Date().toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

let sampleData;

if (type === "pooja") {
  sampleData = {
    to,
    bookingId: "POOJA-" + Date.now(),
    paymentId: "pay_POOJA123",
    name: "Govind Kumar",
    phone: "9876543210",
    bookingType: "Pooja",
    itemName: "Maha Rudrabhishek Pooja",
    unitPrice: 2100,
    amountRupees: 2100,
    bookingTime,
    details: [
      { label: "Pooja Date", value: "25 Aug 2026, 09:00 AM" },
      { label: "Gotra", value: "Kashyap" },
      { label: "Sankalp Name", value: "Govind & Family" },
    ],
  };
} else if (type === "seva") {
  sampleData = {
    to,
    bookingId: "SEVA-" + Date.now(),
    paymentId: "pay_SEVA123",
    name: "Govind Kumar",
    phone: "9876543210",
    bookingType: "Seva",
    amountRupees: 1600,
    bookingTime,
    items: [
      { name: "Annadaan Seva (1 Day)", quantity: 1, unitPrice: 1100, amount: 1100 },
      { name: "Deep Daan Seva", quantity: 5, unitPrice: 100, amount: 500 },
    ],
  };
} else {
  // Default: Prasad booking
  sampleData = {
    to,
    bookingId: "PRASAD-" + Date.now(),
    paymentId: "pay_PRASAD123",
    name: "Govind Kumar",
    phone: "9876543210",
    bookingType: "Prasad",
    prasadName: "Panchamrit Prasad",
    pricePerKg: 250,
    quantity: 2,
    amountRupees: 500,
    bookingTime,
  };
}

const info = await sendBookingReceiptService(sampleData);
console.log("Sent sample", type, "receipt to", to, "| messageId:", info?.messageId);
process.exit(0);
