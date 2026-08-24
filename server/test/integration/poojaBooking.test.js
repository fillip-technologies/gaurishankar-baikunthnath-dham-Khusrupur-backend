import crypto from "crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Mock the Razorpay client so order creation never hits the network. Declared
// before the app import, mirroring the payments/prasad-booking tests.
vi.mock("../../src/configs/razorpay.config.js", () => ({
  default: {
    orders: {
      create: vi.fn(),
    },
  },
}));

import app from "../../src/app.js";
import razorpay from "../../src/configs/razorpay.config.js";
import { transporter } from "../../src/configs/mail.config.js";
import { Pooja } from "../../src/services/bookings/models/pooja.model.js";
import { PoojaBooking } from "../../src/services/bookings/models/poojaBooking.model.js";
import { Payment } from "../../src/services/payments/models/payment.model.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const KEY_SECRET = "rzp_test_secret";

const PAYER = {
  name: "Ravi Kumar",
  email: "ravi@test.com",
  phone: "9876543210",
};

const sign = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const seedPooja = () =>
  Pooja.create({
    poojaName: "Rudrabhishek",
    imageUrl: "https://cdn.test/pooja/rudra.png",
    publicId: "pooja/rudra",
    price: 500,
  });

beforeEach(() => {
  razorpay.orders.create.mockReset();
});

describe("POST /api/v1/pooja/book", () => {
  it("prices the order on the server and creates a pending booking (201)", async () => {
    const pooja = await seedPooja();
    razorpay.orders.create.mockResolvedValue({
      id: "order_BOOK1",
      amount: 100000,
      currency: "INR",
    });

    const res = await request(app)
      .post("/api/v1/pooja/book")
      .send({ poojaId: pooja._id.toString(), quantity: 2, payer: PAYER });

    expect(res.status).toBe(201);
    expect(res.body.data.orderId).toBe("order_BOOK1");
    expect(res.body.data.bookingId).toBeDefined();

    // ₹500 * 2 = ₹1000 = 100000 paise — computed by the server, not the client.
    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000 }),
    );

    const booking = await PoojaBooking.findById(res.body.data.bookingId);
    expect(booking.status).toBe("pending");
    expect(booking.amount).toBe(100000);
    expect(booking.quantity).toBe(2);
    expect(booking.payment).not.toBeNull();

    const payment = await Payment.findById(booking.payment);
    expect(payment.purpose).toBe("booking");
    expect(payment.reference.model).toBe("PoojaBooking");
    expect(payment.reference.id.toString()).toBe(booking._id.toString());
    // Payer/devotee details are persisted on the linked Payment snapshot.
    expect(payment.payer.email).toBe("ravi@test.com");
  });

  it("returns 404 for an unknown pooja", async () => {
    const res = await request(app)
      .post("/api/v1/pooja/book")
      .send({
        poojaId: "64b7f0000000000000000000",
        quantity: 1,
        payer: PAYER,
      });

    expect(res.status).toBe(404);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 400 when payer details are missing", async () => {
    const pooja = await seedPooja();
    const res = await request(app)
      .post("/api/v1/pooja/book")
      .send({ poojaId: pooja._id.toString(), quantity: 1 });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("does not require authentication (anyone can book)", async () => {
    const pooja = await seedPooja();
    razorpay.orders.create.mockResolvedValue({
      id: "order_PUBLIC",
      amount: 50000,
      currency: "INR",
    });

    // No cookie set at all.
    const res = await request(app)
      .post("/api/v1/pooja/book")
      .send({ poojaId: pooja._id.toString(), quantity: 1, payer: PAYER });

    expect(res.status).toBe(201);
  });
});

describe("POST /api/v1/pooja/verify", () => {
  const book = async () => {
    const pooja = await seedPooja();
    razorpay.orders.create.mockResolvedValue({
      id: "order_VERIFY",
      amount: 100000,
      currency: "INR",
    });
    const res = await request(app)
      .post("/api/v1/pooja/book")
      .send({ poojaId: pooja._id.toString(), quantity: 2, payer: PAYER });
    return res.body.data;
  };

  it("confirms the booking for a valid signature (200)", async () => {
    const { bookingId } = await book();

    const razorpayPaymentId = "pay_ABC123";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_VERIFY|${razorpayPaymentId}`,
    );

    const res = await request(app).post("/api/v1/pooja/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId,
      razorpaySignature,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe("confirmed");

    const booking = await PoojaBooking.findById(bookingId);
    expect(booking.status).toBe("confirmed");
  });

  it("emails the receipt + PDF invoice exactly once on confirmation", async () => {
    transporter.sendMail.mockClear();
    const { bookingId } = await book();

    const razorpayPaymentId = "pay_RECEIPT";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_VERIFY|${razorpayPaymentId}`,
    );

    const res = await request(app).post("/api/v1/pooja/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId,
      razorpaySignature,
    });
    expect(res.status).toBe(200);

    // The receipt is sent asynchronously (fire-and-forget on /verify, plus the
    // webhook subscriber which also fires on the SUCCEEDED event). Wait for it to
    // land, then assert the idempotency claim held it to a single send.
    await vi.waitFor(
      () => expect(transporter.sendMail).toHaveBeenCalled(),
      { timeout: 3000 },
    );
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    const mail = transporter.sendMail.mock.calls[0][0];
    expect(mail.to).toBe(PAYER.email);
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments[0].contentType).toBe("application/pdf");

    const booking = await PoojaBooking.findById(bookingId);
    expect(booking.receiptSentAt).not.toBeNull();
  });

  it("marks the booking failed and returns 400 for a bad signature", async () => {
    const { bookingId } = await book();

    const res = await request(app).post("/api/v1/pooja/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId: "pay_BAD",
      razorpaySignature: "deadbeef",
    });

    expect(res.status).toBe(400);

    const booking = await PoojaBooking.findById(bookingId);
    expect(booking.status).toBe("failed");
  });
});

describe("GET /api/v1/pooja/bookings", () => {
  const BOOKINGS_URL = "/api/v1/pooja/bookings";

  let poojaSeq = 0;
  const seedBooking = async (overrides = {}) => {
    // poojaName is unique in the catalogue, so vary it per booking.
    const pooja = await Pooja.create({
      poojaName: `Pooja ${poojaSeq++}`,
      imageUrl: "https://cdn.test/pooja/x.png",
      publicId: `pooja/x${poojaSeq}`,
      price: 500,
    });
    return PoojaBooking.create({
      pooja: pooja._id,
      quantity: 1,
      amount: 50000,
      status: "pending",
      ...overrides,
    });
  };

  it("rejects unauthenticated access (401)", async () => {
    const res = await request(app).get(BOOKINGS_URL);
    expect(res.status).toBe(401);
  });

  it("lists all bookings for an admin", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    await seedBooking();
    await seedBooking({ status: "confirmed" });

    const res = await request(app).get(BOOKINGS_URL).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it("filters by status", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    await seedBooking({ status: "pending" });
    await seedBooking({ status: "confirmed" });

    const res = await request(app)
      .get(`${BOOKINGS_URL}?status=confirmed`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].status).toBe("confirmed");
  });
});
