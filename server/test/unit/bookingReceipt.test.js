import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  bookingReceiptTemplate,
  prasadReceiptTemplate,
} from "../../src/templates/bookingReceipt.template.js";
import {
  generateBookingInvoice,
  generatePrasadInvoice,
} from "../../src/services/bookings/utils/generateBookingInvoice.js";
import {
  sendBookingReceiptService,
} from "../../src/services/bookings/services/bookingReceipt.service.js";
import { transporter } from "../../src/configs/mail.config.js";

describe("bookingReceiptTemplate", () => {
  it("renders a standard prasad booking receipt correctly (backward compatibility)", () => {
    const html = bookingReceiptTemplate({
      name: "Govind Kumar",
      prasadName: "Panchamrit Prasad",
      pricePerKg: 250,
      quantity: 2,
      amountRupees: 500,
      bookingTime: "24 Aug 2026, 12:30 PM",
      bookingId: "PRASAD-12345",
    });

    expect(html).toContain("Shree Gaurishankar Baikunthdham Temple");
    expect(html).toContain("Prasad Booking Confirmed");
    expect(html).toContain("Dear <strong>Govind Kumar</strong>");
    expect(html).toContain("Panchamrit Prasad");
    expect(html).toContain("₹250.00");
    expect(html).toContain("2 kg");
    expect(html).toContain("₹500.00");
    expect(html).toContain("PRASAD-12345");
    expect(html).toContain("24 Aug 2026, 12:30 PM");
    expect(html).toContain("invoice (PDF)");
  });

  it("renders with prasadReceiptTemplate alias seamlessly", () => {
    const html = prasadReceiptTemplate({
      name: "Ravi",
      prasadName: "Laddu",
      pricePerKg: 300,
      quantity: 1,
      amountRupees: 300,
      bookingTime: "24 Aug 2026",
      bookingId: "B1",
    });

    expect(html).toContain("Dear <strong>Ravi</strong>");
    expect(html).toContain("Laddu");
    expect(html).toContain("₹300.00");
  });

  it("renders a Pooja booking receipt with flexible props and custom details", () => {
    const html = bookingReceiptTemplate({
      name: "Amit Sharma",
      bookingType: "Pooja",
      itemName: "Maha Rudrabhishek Pooja",
      unitPrice: 2100,
      unitPriceLabel: "Dakshina",
      amountRupees: 2100,
      bookingTime: "25 Aug 2026, 09:00 AM",
      bookingId: "POOJA-999",
      details: [
        { label: "Pooja Date", value: "28 Aug 2026" },
        { label: "Gotra", value: "Kashyap" },
        { label: "Priest", value: "Pt. Ramdas Shastri" },
      ],
    });

    expect(html).toContain("Pooja Booking Receipt");
    expect(html).toContain("Pooja Booking Confirmed");
    expect(html).toContain("Dear <strong>Amit Sharma</strong>");
    expect(html).toContain("Maha Rudrabhishek Pooja");
    expect(html).toContain("Dakshina");
    expect(html).toContain("₹2100.00");
    expect(html).toContain("Gotra");
    expect(html).toContain("Kashyap");
    expect(html).toContain("Pt. Ramdas Shastri");
    expect(html).toContain("POOJA-999");
  });

  it("renders a multi-item Seva receipt table", () => {
    const html = bookingReceiptTemplate({
      name: "Vikram Singh",
      bookingType: "Seva",
      items: [
        { name: "Annadaan Seva", quantity: 1, unitPrice: 1100, amount: 1100 },
        { name: "Deep Daan", quantity: 5, unitPrice: 100, amount: 500 },
      ],
      amountRupees: 1600,
      bookingTime: "24 Aug 2026, 06:00 PM",
      bookingId: "SEVA-777",
    });

    expect(html).toContain("Seva Booking Receipt");
    expect(html).toContain("Annadaan Seva");
    expect(html).toContain("Deep Daan");
    expect(html).toContain("₹1600.00");
    expect(html).toContain("SEVA-777");
  });

  it("allows custom greetings, custom message, and disabling attachments", () => {
    const html = bookingReceiptTemplate({
      name: "Sneha",
      bookingType: "Darshan",
      greeting: "जय माता दी 🙏",
      message: "Special VIP darshan slot has been reserved.",
      hasAttachment: false,
      amountRupees: 100,
      bookingId: "DARSHAN-01",
    });

    expect(html).toContain("जय माता दी 🙏");
    expect(html).toContain("Special VIP darshan slot has been reserved.");
    expect(html).not.toContain("invoice (PDF)");
  });
});

describe("generateBookingInvoice", () => {
  it("generates a valid PDF buffer for a Prasad booking", async () => {
    const buffer = await generateBookingInvoice({
      bookingId: "SAMPLE-PRASAD",
      paymentId: "pay_123",
      bookingType: "Prasad",
      name: "Govind Kumar",
      email: "govind@test.com",
      phone: "9876543210",
      prasadName: "Panchamrit Prasad",
      pricePerKg: 250,
      quantity: 2,
      amountRupees: 500,
      bookingTime: "24 Aug 2026, 12:00 PM",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // PDF Magic bytes
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates a valid PDF buffer using generatePrasadInvoice alias", async () => {
    const buffer = await generatePrasadInvoice({
      bookingId: "SAMPLE-ALIAS",
      name: "Ravi",
      prasadName: "Laddu",
      pricePerKg: 250,
      quantity: 1,
      amountRupees: 250,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("generates a valid PDF buffer with multiple line items", async () => {
    const buffer = await generateBookingInvoice({
      bookingId: "SAMPLE-SEVA",
      paymentId: "pay_SEVA99",
      bookingType: "Seva",
      name: "Devotee",
      items: [
        { name: "Annadaan Seva", quantity: 1, unitPrice: 1100, amount: 1100 },
        { name: "Gau Seva", quantity: 2, unitPrice: 500, amount: 1000 },
      ],
      details: [{ label: "Gotra", value: "Vashishtha" }],
      amountRupees: 2100,
      bookingTime: "24 Aug 2026, 02:00 PM",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("sendBookingReceiptService", () => {
  beforeEach(() => {
    transporter.sendMail.mockClear();
  });

  it("sends an email with invoice attachment for any booking type", async () => {
    const info = await sendBookingReceiptService({
      to: "devotee@example.com",
      name: "Devotee Name",
      bookingId: "BOOK-101",
      paymentId: "pay_101",
      bookingType: "Pooja",
      itemName: "Maha Mrityunjaya Jaap",
      unitPrice: 5100,
      amountRupees: 5100,
      bookingTime: "24 Aug 2026",
    });

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    const mailArgs = transporter.sendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe("devotee@example.com");
    expect(mailArgs.subject).toContain("Your Pooja Booking Receipt");
    expect(mailArgs.html).toContain("Maha Mrityunjaya Jaap");
    expect(mailArgs.attachments).toHaveLength(1);
    expect(mailArgs.attachments[0].filename).toBe("pooja-invoice-BOOK-101.pdf");
    expect(mailArgs.attachments[0].contentType).toBe("application/pdf");
    expect(mailArgs.attachments[0].content).toBeInstanceOf(Buffer);
  });

  it("skips sending if no email is provided", async () => {
    await sendBookingReceiptService({
      bookingId: "BOOK-NO-EMAIL",
      bookingType: "Prasad",
      amountRupees: 250,
    });

    expect(transporter.sendMail).not.toHaveBeenCalled();
  });
});
