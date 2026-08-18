import crypto from "crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Razorpay secrets are set in test/setup.js (before any config import) so the
// HMAC verification paths use these known, reproducible keys.
//
// Mock the Razorpay client so order creation never hits the network. Declared
// before the app import, mirroring how the gallery test mocks Cloudinary.
vi.mock("../../src/configs/razorpay.config.js", () => ({
  default: {
    orders: {
      create: vi.fn(),
    },
  },
}));

import app from "../../src/app.js";
import razorpay from "../../src/configs/razorpay.config.js";
import { Payment } from "../../src/services/payments/models/payment.model.js";
import { PaymentAudit } from "../../src/services/payments/models/paymentAudit.model.js";
import {
  paymentEvents,
  PAYMENT_EVENTS,
} from "../../src/services/payments/events/payment.events.js";

const KEY_SECRET = "rzp_test_secret";
const WEBHOOK_SECRET = "rzp_test_webhook_secret";

const PAYER = {
  name: "Ravi Kumar",
  email: "ravi@test.com",
  phone: "9876543210",
};

const sign = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

// Seeds an order-stage payment, as /order would have left it.
const seedOrder = async (razorpayOrderId, overrides = {}) =>
  Payment.create({
    payer: PAYER,
    amount: 50000,
    currency: "INR",
    razorpayOrderId,
    status: "created",
    ...overrides,
  });

beforeEach(() => {
  razorpay.orders.create.mockReset();
  paymentEvents.removeAllListeners();
});

describe("POST /api/v1/payments/order", () => {
  it("creates a Razorpay order and a Payment record with an embedded payer (201)", async () => {
    razorpay.orders.create.mockResolvedValue({
      id: "order_TEST123",
      amount: 50000,
      currency: "INR",
      receipt: "rcpt_test",
    });

    const res = await request(app)
      .post("/api/v1/payments/order")
      .send({ payer: PAYER, amount: 50000 });

    expect(res.status).toBe(201);
    expect(res.body.data.orderId).toBe("order_TEST123");
    expect(res.body.data.key).toBe("rzp_test_key");
    expect(res.body.data.amount).toBe(50000);
    expect(res.body.data.paymentId).toBeDefined();
    expect(res.body.data.payer.email).toBe("ravi@test.com");

    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000, currency: "INR" }),
    );

    const payment = await Payment.findOne({ razorpayOrderId: "order_TEST123" });
    expect(payment.status).toBe("created");
    expect(payment.purpose).toBe("general");
    expect(payment.payer.email).toBe("ravi@test.com");

    const audit = await PaymentAudit.findOne({ payment: payment._id });
    expect(audit.action).toBe("created");
  });

  it("records purpose and reference when provided", async () => {
    razorpay.orders.create.mockResolvedValue({
      id: "order_REF",
      amount: 50000,
      currency: "INR",
    });

    const referenceId = "64b7f0000000000000000abc";
    const res = await request(app)
      .post("/api/v1/payments/order")
      .send({
        payer: PAYER,
        amount: 50000,
        purpose: "booking",
        reference: { model: "Booking", id: referenceId },
      });

    expect(res.status).toBe(201);

    const payment = await Payment.findOne({ razorpayOrderId: "order_REF" });
    expect(payment.purpose).toBe("booking");
    expect(payment.reference.model).toBe("Booking");
    expect(payment.reference.id.toString()).toBe(referenceId);
  });

  it("returns 400 for an amount below the minimum", async () => {
    const res = await request(app)
      .post("/api/v1/payments/order")
      .send({ payer: PAYER, amount: 50 });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 400 when payer fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/payments/order")
      .send({ amount: 50000 });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/payments/verify", () => {
  it("marks the payment successful for a valid signature (200)", async () => {
    await seedOrder("order_VERIFY1");

    const razorpayPaymentId = "pay_ABC123";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_VERIFY1|${razorpayPaymentId}`,
    );

    const res = await request(app)
      .post("/api/v1/payments/verify")
      .send({
        razorpayOrderId: "order_VERIFY1",
        razorpayPaymentId,
        razorpaySignature,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("successful");

    const payment = await Payment.findOne({ razorpayOrderId: "order_VERIFY1" });
    expect(payment.status).toBe("successful");
    expect(payment.razorpayPaymentId).toBe(razorpayPaymentId);
  });

  it("emits a succeeded event that subscribers (e.g. booking) can react to", async () => {
    await seedOrder("order_EVENT", {
      purpose: "booking",
      reference: { model: "Booking", id: "64b7f0000000000000000abc" },
    });

    const razorpayPaymentId = "pay_EVT";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_EVENT|${razorpayPaymentId}`,
    );

    const handler = vi.fn();
    paymentEvents.on(PAYMENT_EVENTS.SUCCEEDED, handler);

    await request(app).post("/api/v1/payments/verify").send({
      razorpayOrderId: "order_EVENT",
      razorpayPaymentId,
      razorpaySignature,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const { payment } = handler.mock.calls[0][0];
    expect(payment.purpose).toBe("booking");
    expect(payment.reference.model).toBe("Booking");
  });

  it("marks the payment failed and returns 400 for a bad signature", async () => {
    await seedOrder("order_VERIFY2");

    const res = await request(app)
      .post("/api/v1/payments/verify")
      .send({
        razorpayOrderId: "order_VERIFY2",
        razorpayPaymentId: "pay_ABC123",
        razorpaySignature: "deadbeef",
      });

    expect(res.status).toBe(400);

    const payment = await Payment.findOne({ razorpayOrderId: "order_VERIFY2" });
    expect(payment.status).toBe("failed");
  });

  it("returns 404 when the order does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/payments/verify")
      .send({
        razorpayOrderId: "order_MISSING",
        razorpayPaymentId: "pay_X",
        razorpaySignature: "sig",
      });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/payments/webhook", () => {
  it("settles a payment on a valid payment.captured event (200)", async () => {
    await seedOrder("order_HOOK1");

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_HOOK1", order_id: "order_HOOK1" },
        },
      },
    });
    const signature = sign(WEBHOOK_SECRET, body);

    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-razorpay-signature", signature)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const payment = await Payment.findOne({ razorpayOrderId: "order_HOOK1" });
    expect(payment.status).toBe("successful");
    expect(payment.razorpayPaymentId).toBe("pay_HOOK1");
  });

  it("rejects a webhook with an invalid signature (400)", async () => {
    await seedOrder("order_HOOK2");

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_HOOK2", order_id: "order_HOOK2" } },
      },
    });

    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-razorpay-signature", "wrongsignature")
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(400);

    const payment = await Payment.findOne({ razorpayOrderId: "order_HOOK2" });
    expect(payment.status).toBe("created");
  });
});

describe("GET /api/v1/payments/:id", () => {
  it("returns the payment with its embedded payer details (200)", async () => {
    const payment = await seedOrder("order_GET1");

    const res = await request(app).get(`/api/v1/payments/${payment._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.razorpayOrderId).toBe("order_GET1");
    expect(res.body.data.payer.email).toBe("ravi@test.com");
  });

  it("returns 404 for an unknown payment id", async () => {
    const res = await request(app).get(
      "/api/v1/payments/64b7f0000000000000000000",
    );

    expect(res.status).toBe(404);
  });
});
