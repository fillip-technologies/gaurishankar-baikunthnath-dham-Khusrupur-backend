import crypto from "crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Mock the Razorpay client so order creation never hits the network. Declared
// before the app import, mirroring the payments/pooja-booking tests.
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
import { Room } from "../../src/services/bookings/models/room.model.js";
import { RoomBooking } from "../../src/services/bookings/models/roomBooking.model.js";
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

// Far-future stay dates so the "check-in not in the past" rule always passes.
const CHECK_IN = "2099-06-10";
const CHECK_OUT = "2099-06-12"; // 2 nights

let roomSeq = 0;
const seedRoom = (overrides = {}) =>
  Room.create({
    // roomType is unique in the catalogue, so vary it per room.
    roomType: `Deluxe AC ${roomSeq++}`,
    description: "Air-conditioned room",
    facilities: ["AC", "WiFi"],
    imageUrl: "https://cdn.test/room/deluxe.png",
    publicId: "room/deluxe",
    price: 1500,
    totalRooms: 10,
    availableRooms: 10,
    ...overrides,
  });

beforeEach(() => {
  razorpay.orders.create.mockReset();
});

describe("POST /api/v1/rooms/book", () => {
  it("prices the order by quantity × nights and creates a pending booking (201)", async () => {
    const room = await seedRoom();
    razorpay.orders.create.mockResolvedValue({
      id: "order_BOOK1",
      amount: 600000,
      currency: "INR",
    });

    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({
        roomId: room._id.toString(),
        quantity: 2,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        payer: PAYER,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderId).toBe("order_BOOK1");
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.roomType).toBe(room.roomType);
    expect(res.body.data.nights).toBe(2);

    // ₹1500 × 2 rooms × 2 nights = ₹6000 = 600000 paise — priced by the server.
    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 600000 }),
    );

    const booking = await RoomBooking.findById(res.body.data.bookingId);
    expect(booking.status).toBe("pending");
    expect(booking.stayStatus).toBe("booked");
    expect(booking.amount).toBe(600000);
    expect(booking.quantity).toBe(2);
    expect(booking.checkIn).toEqual(new Date(`${CHECK_IN}T00:00:00.000Z`));
    expect(booking.checkOut).toEqual(new Date(`${CHECK_OUT}T00:00:00.000Z`));
    expect(booking.payment).not.toBeNull();

    const payment = await Payment.findById(booking.payment);
    expect(payment.purpose).toBe("booking");
    expect(payment.reference.model).toBe("RoomBooking");
    expect(payment.reference.id.toString()).toBe(booking._id.toString());
    expect(payment.payer.email).toBe("ravi@test.com");
  });

  it("defaults quantity to 1 when omitted", async () => {
    const room = await seedRoom();
    razorpay.orders.create.mockResolvedValue({
      id: "order_DEFAULT",
      amount: 300000,
      currency: "INR",
    });

    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({
        roomId: room._id.toString(),
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        payer: PAYER,
      });

    expect(res.status).toBe(201);
    // 1 room × 2 nights × ₹1500 = 300000 paise.
    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 300000 }),
    );
    const booking = await RoomBooking.findById(res.body.data.bookingId);
    expect(booking.quantity).toBe(1);
  });

  it("returns 400 when the stay dates are missing", async () => {
    const room = await seedRoom();
    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({ roomId: room._id.toString(), quantity: 1, payer: PAYER });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 400 when check-out is not after check-in", async () => {
    const room = await seedRoom();
    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({
        roomId: room._id.toString(),
        quantity: 1,
        checkIn: CHECK_IN,
        checkOut: CHECK_IN,
        payer: PAYER,
      });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown room", async () => {
    const res = await request(app).post("/api/v1/rooms/book").send({
      roomId: "64b7f0000000000000000000",
      quantity: 1,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      payer: PAYER,
    });

    expect(res.status).toBe(404);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("returns 400 when payer details are missing", async () => {
    const room = await seedRoom();
    const res = await request(app).post("/api/v1/rooms/book").send({
      roomId: room._id.toString(),
      quantity: 1,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
    });

    expect(res.status).toBe(400);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("does not require authentication (anyone can book)", async () => {
    const room = await seedRoom();
    razorpay.orders.create.mockResolvedValue({
      id: "order_PUBLIC",
      amount: 300000,
      currency: "INR",
    });

    // No cookie set at all.
    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({
        roomId: room._id.toString(),
        quantity: 1,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        payer: PAYER,
      });

    expect(res.status).toBe(201);
  });
});

describe("POST /api/v1/rooms/verify", () => {
  const book = async () => {
    const room = await seedRoom();
    razorpay.orders.create.mockResolvedValue({
      id: "order_VERIFY",
      amount: 600000,
      currency: "INR",
    });
    const res = await request(app)
      .post("/api/v1/rooms/book")
      .send({
        roomId: room._id.toString(),
        quantity: 2,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        payer: PAYER,
      });
    return res.body.data;
  };

  it("confirms the booking for a valid signature (200)", async () => {
    const { bookingId } = await book();

    const razorpayPaymentId = "pay_ABC123";
    const razorpaySignature = sign(
      KEY_SECRET,
      `order_VERIFY|${razorpayPaymentId}`,
    );

    const res = await request(app).post("/api/v1/rooms/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId,
      razorpaySignature,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe("confirmed");

    const booking = await RoomBooking.findById(bookingId);
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

    const res = await request(app).post("/api/v1/rooms/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId,
      razorpaySignature,
    });
    expect(res.status).toBe(200);

    // The receipt is sent asynchronously (fire-and-forget on /verify, plus the
    // webhook subscriber which also fires on the SUCCEEDED event). Wait for it to
    // land, then assert the idempotency claim held it to a single send.
    await vi.waitFor(() => expect(transporter.sendMail).toHaveBeenCalled(), {
      timeout: 3000,
    });
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    const mail = transporter.sendMail.mock.calls[0][0];
    expect(mail.to).toBe(PAYER.email);
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments[0].contentType).toBe("application/pdf");
    // The auto-generated Razorpay payment id rides along on the receipt.
    expect(mail.html).toContain("pay_RECEIPT");

    const booking = await RoomBooking.findById(bookingId);
    expect(booking.receiptSentAt).not.toBeNull();
  });

  it("marks the booking failed and returns 400 for a bad signature", async () => {
    const { bookingId } = await book();

    const res = await request(app).post("/api/v1/rooms/verify").send({
      razorpayOrderId: "order_VERIFY",
      razorpayPaymentId: "pay_BAD",
      razorpaySignature: "deadbeef",
    });

    expect(res.status).toBe(400);

    // The booking is marked failed by the async FAILED payment subscriber, so
    // wait for it rather than reading immediately after the response.
    await vi.waitFor(
      async () => {
        const booking = await RoomBooking.findById(bookingId);
        expect(booking.status).toBe("failed");
      },
      { timeout: 3000 },
    );
  });
});

describe("GET /api/v1/rooms/availability (date-range)", () => {
  const AVAIL_URL = "/api/v1/rooms/availability";

  // A confirmed booking occupying `quantity` rooms for [checkIn, checkOut).
  const confirmedBooking = (room, checkIn, checkOut, quantity = 1) =>
    RoomBooking.create({
      room: room._id,
      quantity,
      amount: room.price * quantity * 100,
      status: "confirmed",
      checkIn: new Date(`${checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${checkOut}T00:00:00.000Z`),
    });

  const availabilityFor = async (roomId, checkIn, checkOut) => {
    const res = await request(app).get(
      `${AVAIL_URL}?checkIn=${checkIn}&checkOut=${checkOut}`,
    );
    const row = res.body.data.find((r) => r._id === roomId.toString());
    return { status: res.status, available: row?.available, nights: row?.nights };
  };

  it("reports full inventory when there are no bookings", async () => {
    const room = await seedRoom({ totalRooms: 5, availableRooms: 5 });
    const { status, available, nights } = await availabilityFor(
      room._id,
      "2099-06-10",
      "2099-06-12",
    );
    expect(status).toBe(200);
    expect(available).toBe(5);
    expect(nights).toBe(2);
  });

  it("checkout is exclusive: a 10→12 booking frees the room on the 12th", async () => {
    const room = await seedRoom({ totalRooms: 1, availableRooms: 1 });
    await confirmedBooking(room, "2099-06-10", "2099-06-12", 1);

    // Same nights → fully booked.
    expect((await availabilityFor(room._id, "2099-06-10", "2099-06-12")).available).toBe(0);
    // Starting on the checkout day → free again.
    expect((await availabilityFor(room._id, "2099-06-12", "2099-06-14")).available).toBe(1);
  });

  it("uses peak-per-night, not blanket overlap", async () => {
    const room = await seedRoom({ totalRooms: 1, availableRooms: 1 });
    // Occupied 10→14 (nights 10,11,12,13).
    await confirmedBooking(room, "2099-06-10", "2099-06-14", 1);

    // Query 13→15: night 13 is occupied → 0 free for the range.
    expect((await availabilityFor(room._id, "2099-06-13", "2099-06-15")).available).toBe(0);
    // Query 14→15: night 14 is free → 1 free.
    expect((await availabilityFor(room._id, "2099-06-14", "2099-06-15")).available).toBe(1);
  });

  it("ignores pending bookings — only confirmed ones occupy", async () => {
    const room = await seedRoom({ totalRooms: 2, availableRooms: 2 });
    await RoomBooking.create({
      room: room._id,
      quantity: 2,
      amount: room.price * 2 * 100,
      status: "pending",
      checkIn: new Date("2099-06-10T00:00:00.000Z"),
      checkOut: new Date("2099-06-12T00:00:00.000Z"),
    });

    expect((await availabilityFor(room._id, "2099-06-10", "2099-06-12")).available).toBe(2);
  });

  it("blocks booking a room that is full for the requested range (409)", async () => {
    const room = await seedRoom({ totalRooms: 1, availableRooms: 1 });
    await confirmedBooking(room, "2099-06-10", "2099-06-12", 1);

    const res = await request(app).post("/api/v1/rooms/book").send({
      roomId: room._id.toString(),
      quantity: 1,
      checkIn: "2099-06-10",
      checkOut: "2099-06-12",
      payer: PAYER,
    });

    expect(res.status).toBe(409);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });

  it("allows booking the same room for a non-overlapping range", async () => {
    const room = await seedRoom({ totalRooms: 1, availableRooms: 1 });
    await confirmedBooking(room, "2099-06-10", "2099-06-12", 1);
    razorpay.orders.create.mockResolvedValue({
      id: "order_NONOVERLAP",
      amount: 150000,
      currency: "INR",
    });

    const res = await request(app).post("/api/v1/rooms/book").send({
      roomId: room._id.toString(),
      quantity: 1,
      checkIn: "2099-06-12",
      checkOut: "2099-06-13",
      payer: PAYER,
    });

    expect(res.status).toBe(201);
  });
});

describe("Room check-in / check-out", () => {
  // Creates a paid, ready-to-check-in booking against a room with the given
  // availability, bypassing the payment flow.
  const seedConfirmedBooking = async (roomOverrides = {}, quantity = 1) => {
    const room = await seedRoom(roomOverrides);
    const booking = await RoomBooking.create({
      room: room._id,
      quantity,
      amount: room.price * quantity * 100,
      status: "confirmed",
      stayStatus: "booked",
    });
    return { room, booking };
  };

  it("check-in decrements availability and sets the stay status (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const { room, booking } = await seedConfirmedBooking(
      { totalRooms: 5, availableRooms: 5 },
      2,
    );

    const res = await request(app)
      .patch(`/api/v1/rooms/checkin/${booking._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.availableRooms).toBe(3);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.availableRooms).toBe(3);

    const updatedBooking = await RoomBooking.findById(booking._id);
    expect(updatedBooking.stayStatus).toBe("checked_in");
    expect(updatedBooking.checkInAt).not.toBeNull();
  });

  it("check-out increments availability back and sets the stay status (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const { room, booking } = await seedConfirmedBooking(
      { totalRooms: 5, availableRooms: 4 },
      1,
    );
    // Move the booking into the checked-in state first.
    booking.stayStatus = "checked_in";
    await booking.save();

    const res = await request(app)
      .patch(`/api/v1/rooms/checkout/${booking._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.availableRooms).toBe(5);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.availableRooms).toBe(5);

    const updatedBooking = await RoomBooking.findById(booking._id);
    expect(updatedBooking.stayStatus).toBe("checked_out");
    expect(updatedBooking.checkOutAt).not.toBeNull();
  });

  it("check-out never pushes availability above the total inventory", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    // availableRooms already at total; a stray check-out must not overshoot.
    const { room, booking } = await seedConfirmedBooking(
      { totalRooms: 3, availableRooms: 3 },
      1,
    );
    booking.stayStatus = "checked_in";
    await booking.save();

    const res = await request(app)
      .patch(`/api/v1/rooms/checkout/${booking._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.availableRooms).toBe(3);
  });

  it("is idempotent: a second check-in does not double-decrement (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const { room, booking } = await seedConfirmedBooking(
      { totalRooms: 5, availableRooms: 5 },
      1,
    );

    const first = await request(app)
      .patch(`/api/v1/rooms/checkin/${booking._id}`)
      .set("Cookie", cookie);
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/v1/rooms/checkin/${booking._id}`)
      .set("Cookie", cookie);
    expect(second.status).toBe(409);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.availableRooms).toBe(4);
  });

  it("refuses to check in a booking that is not confirmed (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const room = await seedRoom({ totalRooms: 5, availableRooms: 5 });
    const booking = await RoomBooking.create({
      room: room._id,
      quantity: 1,
      amount: 150000,
      status: "pending",
      stayStatus: "booked",
    });

    const res = await request(app)
      .patch(`/api/v1/rooms/checkin/${booking._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(409);
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.availableRooms).toBe(5);
  });

  it("refuses to check out a booking that is not checked in (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const { booking } = await seedConfirmedBooking();

    const res = await request(app)
      .patch(`/api/v1/rooms/checkout/${booking._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(409);
  });

  it("rejects unauthenticated check-in (401)", async () => {
    const { booking } = await seedConfirmedBooking();
    const res = await request(app).patch(`/api/v1/rooms/checkin/${booking._id}`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/rooms/bookings", () => {
  const BOOKINGS_URL = "/api/v1/rooms/bookings";

  const seedBooking = async (overrides = {}) => {
    const room = await seedRoom();
    return RoomBooking.create({
      room: room._id,
      quantity: 1,
      amount: 150000,
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

  it("filters by stayStatus", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    await seedBooking({ status: "confirmed", stayStatus: "booked" });
    await seedBooking({ status: "confirmed", stayStatus: "checked_in" });

    const res = await request(app)
      .get(`${BOOKINGS_URL}?stayStatus=checked_in`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].stayStatus).toBe("checked_in");
  });
});
