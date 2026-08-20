import crypto from "crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Mock the Razorpay client so order creation never hits the network. Declared
// before the app import, mirroring the payments test.
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
import { Prasad } from "../../src/services/bookings/models/prasad.model.js";
import { PrasadBooking } from "../../src/services/bookings/models/prasadBooking.model.js";
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

const seedPrasad = () =>
  Prasad.create({
    prasadName: "Laddu",
    imageUrl: "https://cdn.test/prasad/laddu.png",
    publicId: "prasad/laddu",
    pricePerKg: 250,
  });

beforeEach(() => {
  razorpay.orders.create.mockReset();
});

describe("POST /api/v1/prasad/book", () => {
  it("prices the order on the server and creates a pending booking (201)", async () => {
    const prasad = await seedPrasad();
    razorpay.orders.create.mockResolvedValue({
      id: "order_BOOK1",
      amount: 50000,
      currency: "INR",
    });

    const res = await request(app)
      .post("/api/v1/prasad/book")
      .send({ prasadId: prasad._id.toString(), quantity: 2, payer: PAYER });

    expect(res.status).toBe(201);
    expect(res.body.data.orderId).toBe("order_BOOK1");
    expect(res.body.data.bookingId).toBeDefined();

    // 250/kg * 2kg = ₹500 = 50000 paise — computed by the server, not the client.
    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000 }),
    );

    const booking = await PrasadBooking.findById(res.body.data.bookingId);
    expect(booking.status).toBe("pending");
    expect(booking.amount).toBe(50000);
    expect(booking.quantity).toBe(2);
    expect(booking.payment).not.toBeNull();

    const payment = await Payment.findById(booking.payment);
    expect(payment.purpose).toBe("booking");
    expect(payment.reference.model).toBe("PrasadBooking");
    expect(payment.reference.id.toString()).toBe(booking._id.toString());
  });

  it("returns 404 for an unknown prasad", async () => {
    const res = await request(app)
      .post("/api/v1/prasad/book")
      .send({
        prasadId: "64b7f0000000000000000000",
        quantity: 1,
        payer: PAYER,
      });

    expect(res.status).toBe(404);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 400 when payer details are missing", async () => {
    const prasad = await seedPrasad();
    const res = await request(app)
      .post("/api/v1/prasad/book")
      .send({ prasadId: prasad._id.toString(), quantity: 1 });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/prasad/verify", () => {
  const book = async () => {
    const prasad = await seedPrasad();
    razorpay.orders.create.mockResolvedValue({
      id: "order_VERIFY",
      amount: 50000,
      currency: "INR",
    });
    const res = await request(app)
      .post("/api/v1/prasad/book")
      .send({ prasadId: prasad._id.toString(), quantity: 2, payer: PAYER });
    return res.body.data;
  };

  it("confirms the booking for a valid signature (200)", async () => {
    const { bookingId } = await book();

    const razorpayPaymentId = "pay_ABC123";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_VERIFY|${razorpayPaymentId}`,
    );

    const res = await request(app).post("/api/v1/prasad/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId,
      razorpaySignature,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe("confirmed");

    const booking = await PrasadBooking.findById(bookingId);
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

    const res = await request(app).post("/api/v1/prasad/verify").send({
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
    expect(mail.attachments[0].content).toBeInstanceOf(Buffer);

    const booking = await PrasadBooking.findById(bookingId);
    expect(booking.receiptSentAt).not.toBeNull();
  });

  it("marks the booking failed and returns 400 for a bad signature", async () => {
    const { bookingId } = await book();

    const res = await request(app).post("/api/v1/prasad/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId: "pay_ABC123",
      razorpaySignature: "deadbeef",
    });

    expect(res.status).toBe(400);

    const booking = await PrasadBooking.findById(bookingId);
    expect(booking.status).toBe("failed");
  });
});

describe("GET /api/v1/prasad/bookings", () => {
  const BOOKINGS_URL = "/api/v1/prasad/bookings";

  // Seeds a booking with an explicit status + createdAt (timestamps disabled so
  // the provided createdAt is not overwritten).
  const seedBooking = async (prasadId, { status, createdAt }) => {
    const booking = await PrasadBooking.create({
      prasad: prasadId,
      quantity: 1,
      amount: 25000,
      status,
    });
    if (createdAt) {
      // `createdAt` is immutable under timestamps:true, so overwriteImmutable is
      // required to backdate it for the date-range tests.
      await PrasadBooking.updateOne(
        { _id: booking._id },
        { $set: { createdAt } },
        { timestamps: false, overwriteImmutable: true },
      );
    }
    return booking;
  };

  it("rejects unauthenticated access (401)", async () => {
    const res = await request(app).get(BOOKINGS_URL);
    expect(res.status).toBe(401);
  });

  it("lists all bookings newest-first for an admin", async () => {
    const prasad = await seedPrasad();
    await seedBooking(prasad._id, {
      status: "confirmed",
      createdAt: new Date("2026-01-10T10:00:00Z"),
    });
    await seedBooking(prasad._id, {
      status: "pending",
      createdAt: new Date("2026-03-10T10:00:00Z"),
    });

    const cookie = await authCookieFor(await makeAdmin());
    const res = await request(app).get(BOOKINGS_URL).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    // Newest first.
    expect(
      new Date(res.body.data.bookings[0].createdAt).getTime(),
    ).toBeGreaterThan(new Date(res.body.data.bookings[1].createdAt).getTime());
    // Prasad catalogue is joined in.
    expect(res.body.data.bookings[0].prasad.prasadName).toBe("Laddu");
  });

  it("filters by status", async () => {
    const prasad = await seedPrasad();
    await seedBooking(prasad._id, { status: "confirmed" });
    await seedBooking(prasad._id, { status: "pending" });

    const cookie = await authCookieFor(await makeAdmin());
    const res = await request(app)
      .get(`${BOOKINGS_URL}?status=confirmed`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].status).toBe("confirmed");
  });

  it("filters by a createdAt date range (inclusive)", async () => {
    const prasad = await seedPrasad();
    await seedBooking(prasad._id, {
      status: "confirmed",
      createdAt: new Date("2026-01-05T09:00:00Z"),
    });
    const inRange = await seedBooking(prasad._id, {
      status: "confirmed",
      createdAt: new Date("2026-02-15T09:00:00Z"),
    });
    await seedBooking(prasad._id, {
      status: "confirmed",
      createdAt: new Date("2026-03-25T09:00:00Z"),
    });

    const cookie = await authCookieFor(await makeAdmin());
    const res = await request(app)
      .get(`${BOOKINGS_URL}?from=2026-02-01&to=2026-02-28`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0]._id).toBe(inRange._id.toString());
  });

  it("paginates results and reports pagination metadata", async () => {
    const prasad = await seedPrasad();
    // 5 bookings, backdated so ordering (and thus page contents) is deterministic.
    for (let i = 0; i < 5; i++) {
      await seedBooking(prasad._id, {
        status: "confirmed",
        createdAt: new Date(`2026-02-0${i + 1}T09:00:00Z`),
      });
    }

    const cookie = await authCookieFor(await makeAdmin());
    const res = await request(app)
      .get(`${BOOKINGS_URL}?page=2&limit=2`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
    });
  });

  it("caps limit at 100 and falls back to defaults for bad input", async () => {
    const prasad = await seedPrasad();
    await seedBooking(prasad._id, { status: "confirmed" });

    const cookie = await authCookieFor(await makeAdmin());
    const res = await request(app)
      .get(`${BOOKINGS_URL}?page=abc&limit=9999`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 100 });
  });
});
