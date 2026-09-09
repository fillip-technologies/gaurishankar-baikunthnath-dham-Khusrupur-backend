import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import { createOrderService } from "../../payments/services/payment.service.js";
import { Room } from "../models/room.model.js";
import { RoomBooking } from "../models/roomBooking.model.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Number of nights in [checkIn, checkOut). Checkout is exclusive, so 10th→12th
// is 2 nights. Both args are Date objects at UTC midnight.
export const nightsBetween = (checkIn, checkOut) =>
  Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);

/**
 * Date-range availability for one or more rooms: how many of each room type are
 * free for EVERY night of [checkIn, checkOut).
 *
 * A room is occupied on a night if a CONFIRMED booking's [checkIn, checkOut)
 * covers it. We take the PEAK concurrent booked quantity across the requested
 * nights (not the sum of all overlaps), since a booking that ends before another
 * begins doesn't compete for the same night. `available = totalRooms − peak`.
 *
 * Only `confirmed` bookings count. Pending ones are ignored on purpose: there is
 * no hold/expiry mechanism here, so counting them would let any abandoned
 * checkout lock a room forever. (Residual: two payers can confirm the last room
 * within the same Razorpay window — temple-scale rare, accepted.)
 *
 * @returns Map<roomIdString, availableCount>
 */
export const getRoomAvailabilityMap = async ({ roomIds, checkIn, checkOut }) => {
  const rooms = await Room.find({ _id: { $in: roomIds } })
    .select("totalRooms")
    .lean();
  const totalById = new Map(rooms.map((r) => [String(r._id), r.totalRooms]));

  // Every confirmed booking that touches the requested range.
  const overlapping = await RoomBooking.find({
    room: { $in: roomIds },
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  })
    .select("room quantity checkIn checkOut")
    .lean();

  // Group each room's overlapping bookings, then walk night by night to find the
  // peak concurrent quantity within the requested window.
  const byRoom = new Map();
  for (const b of overlapping) {
    const key = String(b.room);
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key).push(b);
  }

  const result = new Map();
  for (const roomId of roomIds) {
    const key = String(roomId);
    const total = totalById.get(key) ?? 0;
    const bookings = byRoom.get(key) || [];

    let peak = 0;
    for (
      let night = checkIn.getTime();
      night < checkOut.getTime();
      night += MS_PER_DAY
    ) {
      let concurrent = 0;
      for (const b of bookings) {
        if (b.checkIn.getTime() <= night && b.checkOut.getTime() > night) {
          concurrent += b.quantity;
        }
      }
      if (concurrent > peak) peak = concurrent;
    }

    result.set(key, Math.max(0, total - peak));
  }

  return result;
};

/**
 * Creates a room booking and a matching Razorpay order.
 * The price is ALWAYS computed here from the catalogue (room.price × quantity ×
 * nights) — the client only chooses the room type, quantity and dates, never the
 * amount. Availability is enforced for the chosen date range, not the physical
 * `availableRooms` counter (which the admin check-in/out flow owns).
 */
export const createRoomBookingService = async ({
  roomId,
  quantity,
  payer,
  checkIn,
  checkOut,
  ipAddress,
  userAgent,
}) => {
  const room = await Room.findById(roomId).lean();
  if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Room not found");

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Check-out must be after check-in",
    );
  }

  // Enforce availability for the requested date range, not the live counter.
  const availabilityMap = await getRoomAvailabilityMap({
    roomIds: [room._id],
    checkIn,
    checkOut,
  });
  const available = availabilityMap.get(String(room._id)) ?? 0;
  if (available < quantity) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      `Only ${available} room(s) available for ${room.roomType} on those dates`,
    );
  }

  // price is in rupees; Razorpay wants the smallest unit (paise). Multiply by the
  // number of nights, not just the quantity.
  const amount = Math.round(room.price * quantity * nights * 100);
  if (amount < 100) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Order amount is too small");
  }

  // 1. Record the booking in a not-yet-paid state.
  const booking = await RoomBooking.create({
    room: room._id,
    quantity,
    amount,
    checkIn,
    checkOut,
    status: "pending",
  });

  // 2. Ask the payments module for an order tied back to this booking.
  const order = await createOrderService({
    amount,
    payer,
    purpose: "booking",
    reference: { model: "RoomBooking", id: booking._id },
    notes: {
      roomType: room.roomType,
      quantity: String(quantity),
      nights: String(nights),
    },
    ipAddress,
    userAgent,
  });

  // 3. Link the payment back onto the booking.
  booking.payment = order.paymentId;
  await booking.save();

  return {
    bookingId: booking._id,
    roomType: room.roomType,
    quantity,
    nights,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    ...order, // key, orderId, amount, currency, paymentId, payer
  };
};

/**
 * Public catalogue with per-date-range availability. Returns every room plus an
 * `available` count for [checkIn, checkOut) — one query for the whole list, so
 * the booking page can price and gate every card from a single request.
 */
export const getRoomsWithAvailabilityService = async ({ checkIn, checkOut }) => {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Check-out must be after check-in",
    );
  }

  const rooms = await Room.find().lean();
  const availabilityMap = await getRoomAvailabilityMap({
    roomIds: rooms.map((r) => r._id),
    checkIn,
    checkOut,
  });

  return rooms.map((r) => ({
    ...r,
    // Availability for the requested range, capped at the physical inventory.
    available: availabilityMap.get(String(r._id)) ?? r.totalRooms,
    nights,
  }));
};

/**
 * Checks a confirmed booking in. Flips the booking's stayStatus atomically first
 * (so a repeated call is a no-op), then decrements the room's availability by the
 * booked quantity. Only a paid (`confirmed`) booking that is still `booked` can be
 * checked in.
 */
export const checkInRoomBookingService = async ({ bookingId }) => {
  const booking = await RoomBooking.findOneAndUpdate(
    { _id: bookingId, status: "confirmed", stayStatus: "booked" },
    { $set: { stayStatus: "checked_in", checkInAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!booking) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Booking is not eligible for check-in (must be confirmed and not already checked in)",
    );
  }

  // Decrement availability, guarding against going negative. If there is no room
  // free, roll the stayStatus back so the operation is consistent.
  const room = await Room.findOneAndUpdate(
    { _id: booking.room, availableRooms: { $gte: booking.quantity } },
    { $inc: { availableRooms: -booking.quantity } },
    { returnDocument: "after" },
  );

  if (!room) {
    await RoomBooking.findByIdAndUpdate(bookingId, {
      stayStatus: "booked",
      checkInAt: null,
    });
    throw new ApiError(HTTP_STATUS.CONFLICT, "No rooms available to check in");
  }

  return { booking, availableRooms: room.availableRooms };
};

/**
 * Checks a booking out. Flips stayStatus atomically, then returns the rooms to
 * the pool (capped at totalRooms so a double count can never overshoot).
 */
export const checkOutRoomBookingService = async ({ bookingId }) => {
  const booking = await RoomBooking.findOneAndUpdate(
    { _id: bookingId, stayStatus: "checked_in" },
    { $set: { stayStatus: "checked_out", checkOutAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!booking) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Booking is not checked in, so it can not be checked out",
    );
  }

  // Return the rooms to the pool, never exceeding the inventory size. The
  // booking's stayStatus guard above already makes a double check-out a no-op,
  // so a plain read-modify-write is safe here.
  const room = await Room.findById(booking.room);
  if (room) {
    room.availableRooms = Math.min(
      room.totalRooms,
      room.availableRooms + booking.quantity,
    );
    await room.save();
  }

  return { booking, availableRooms: room?.availableRooms };
};

const BOOKING_STATUSES = ["pending", "confirmed", "failed"];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toBoundedInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return Math.min(n, max);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Lists room bookings for the admin dashboard, newest first, with the room
 * catalogue details and payer/payment snapshot joined in.
 *
 * Optional filters (any combination): `status`, `stayStatus`, and a `from`/`to`
 * createdAt date range. Paginated via `page`/`limit`.
 */
export const getAllRoomBookingsService = async ({
  status,
  stayStatus,
  from,
  to,
  page,
  limit,
} = {}) => {
  const filter = {};

  if (status && BOOKING_STATUSES.includes(status)) {
    filter.status = status;
  }

  if (
    stayStatus &&
    ["booked", "checked_in", "checked_out"].includes(stayStatus)
  ) {
    filter.stayStatus = stayStatus;
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) {
      filter.createdAt[DATE_ONLY.test(to) ? "$lt" : "$lte"] = DATE_ONLY.test(to)
        ? new Date(toDate.getTime() + ONE_DAY_MS)
        : toDate;
    }
  }

  const currentPage = toBoundedInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = toBoundedInt(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  const [bookings, total] = await Promise.all([
    RoomBooking.find(filter)
      .populate("room", "roomType price")
      .populate("payment", "payer status razorpayPaymentId amount currency")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    RoomBooking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 0,
    },
  };
};
