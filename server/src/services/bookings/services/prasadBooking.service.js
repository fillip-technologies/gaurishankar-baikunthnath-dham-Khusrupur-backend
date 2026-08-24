import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import { createOrderService } from "../../payments/services/payment.service.js";
import { Prasad } from "../models/prasad.model.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";

/**
 * Creates a prasad booking and a matching Razorpay order.
 * The price is ALWAYS computed here from the catalogue (prasad.pricePerKg) — the
 * client only chooses the prasad and quantity, never the amount. Booking depends
 * on payments (it calls createOrderService); payments knows nothing about prasad.
 */
export const createPrasadBookingService = async ({
  prasadId,
  quantity,
  payer,
  ipAddress,
  userAgent,
}) => {
  const prasad = await Prasad.findById(prasadId).lean();
  if (!prasad) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Prasad not found");

  // pricePerKg is in rupees; Razorpay wants the smallest unit (paise).
  const amount = Math.round(prasad.pricePerKg * quantity * 100);
  if (amount < 100) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Order amount is too small");
  }

  // 1. Record the booking in a not-yet-paid state.
  const booking = await PrasadBooking.create({
    prasad: prasad._id,
    quantity,
    amount,
    status: "pending",
  });

  // 2. Ask the payments module for an order tied back to this booking.
  const order = await createOrderService({
    amount,
    payer,
    purpose: "booking",
    reference: { model: "PrasadBooking", id: booking._id },
    notes: { prasadName: prasad.prasadName, quantity: String(quantity) },
    ipAddress,
    userAgent,
  });

  // 3. Link the payment back onto the booking.
  booking.payment = order.paymentId;
  await booking.save();

  return {
    bookingId: booking._id,
    prasadName: prasad.prasadName,
    quantity,
    ...order, // key, orderId, amount, currency, paymentId, payer
  };
};

const BOOKING_STATUSES = ["pending", "confirmed", "failed"];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Clamps a query value to a positive integer within [min, max], falling back to
// `fallback` for missing/invalid input.
const toBoundedInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < min) return fallback;
  return Math.min(n, max);
};

// Parses a query date; returns null for missing/invalid values (which are then
// simply ignored, matching how the status filter treats bad input).
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Lists prasad bookings for the admin dashboard, newest first, with the prasad
 * catalogue details and payer/payment snapshot joined in.
 *
 * Optional filters (any combination):
 *   - `status`     one of pending|confirmed|failed
 *   - `from`/`to`  createdAt date range. A bare date (YYYY-MM-DD) is treated as
 *                  an inclusive whole-day bound in UTC; a full ISO timestamp is
 *                  used as-is. Invalid values are ignored.
 *
 * Paginated: `page` (default 1) and `limit` (default 20, max 100). Returns the
 * page of bookings plus a `pagination` summary.
 */
export const getAllPrasadBookingsService = async ({
  status,
  from,
  to,
  page,
  limit,
} = {}) => {
  const filter = {};

  if (status && BOOKING_STATUSES.includes(status)) {
    filter.status = status;
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) {
      // A bare "YYYY-MM-DD" parses to 00:00 UTC, so extend to the end of that day
      // (exclusive next-day start) to keep the upper bound inclusive.
      filter.createdAt[DATE_ONLY.test(to) ? "$lt" : "$lte"] = DATE_ONLY.test(to)
        ? new Date(toDate.getTime() + ONE_DAY_MS)
        : toDate;
    }
  }

  const currentPage = toBoundedInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = toBoundedInt(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  const [bookings, total] = await Promise.all([
    PrasadBooking.find(filter)
      .populate("prasad", "prasadName pricePerKg")
      .populate("payment", "payer status razorpayPaymentId amount currency")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    PrasadBooking.countDocuments(filter),
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
