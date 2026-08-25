import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { verifyPaymentService } from "../../payments/services/payment.service.js";
import {
  createPrasadBookingService,
  getAllPrasadBookingsService,
} from "../services/prasadBooking.service.js";
import {
  createPoojaBookingService,
  createManualPoojaBookingService,
  updatePoojaBookingStatusService,
  getAllPoojaBookingsService,
} from "../services/poojaBooking.service.js";
import {
  createRoomBookingService,
  getAllRoomBookingsService,
  checkInRoomBookingService,
  checkOutRoomBookingService,
} from "../services/roomBooking.service.js";
import {
  sendPrasadReceiptService,
  sendPoojaReceiptService,
  sendRoomReceiptService,
} from "../services/bookingReceipt.service.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";
import { PoojaBooking } from "../models/poojaBooking.model.js";
import { RoomBooking } from "../models/roomBooking.model.js";


export const bookPrasad = asyncHandler(async (req, res) => {
  const { prasadId, quantity, payer } = req.validated.body;

  const result = await createPrasadBookingService({
    prasadId,
    quantity,
    payer,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, result, "Prasad booking created"),
    );
});

// Step 2: the frontend calls this after Razorpay Checkout completes. We delegate
// signature verification to the payments module, then confirm the booking here
// so the response reflects the final status immediately (the webhook subscriber
// covers the case where this call never happens).
export const verifyPrasadBooking = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.validated.body;

  const payment = await verifyPaymentService({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  const booking = await PrasadBooking.findOneAndUpdate(
    { payment: payment.paymentId },
    { status: "confirmed" },
    { returnDocument: "after" },
  )
    .populate("prasad", "prasadName pricePerKg")
    .lean();

  
  if (booking?._id) {
    sendPrasadReceiptService(booking._id).catch(() => {});
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, { payment, booking }, "Payment verified"),
    );
});

// Admin: list every prasad booking (newest first). Optional filters:
// `?status=pending|confirmed|failed`, a `?from=YYYY-MM-DD&to=YYYY-MM-DD`
// createdAt date range, and `?page`/`?limit` pagination.
export const getAllBookings = asyncHandler(async (req, res) => {
  const { status, from, to, page, limit } = req.query;

  const { bookings, pagination } = await getAllPrasadBookingsService({
    status,
    from,
    to,
    page,
    limit,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { bookings, pagination },
        bookings.length ? "All prasad bookings" : "No bookings found",
      ),
    );
});

// --- Pooja bookings ---------------------------------------------------------
// Public checkout: the devotee picks a pooja + quantity; the server prices it
// from the catalogue and returns a Razorpay order.
export const bookPooja = asyncHandler(async (req, res) => {
  const { poojaId, quantity, payer, bookingDate } = req.validated.body;

  const result = await createPoojaBookingService({
    poojaId,
    quantity,
    payer,
    bookingDate,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, "Pooja booking created"));
});

// Step 2: called after Razorpay Checkout completes. Signature verification is
// delegated to the payments module; we then confirm the booking here so the
// response reflects the final status immediately (the webhook subscriber covers
// the case where this call never happens).
export const verifyPoojaBooking = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.validated.body;

  const payment = await verifyPaymentService({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  const booking = await PoojaBooking.findOneAndUpdate(
    { payment: payment.paymentId },
    { status: "confirmed" },
    { returnDocument: "after" },
  )
    .populate("pooja", "poojaName price")
    .lean();

  if (booking?._id) {
    sendPoojaReceiptService(booking._id).catch(() => {});
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, { payment, booking }, "Payment verified"),
    );
});

// Admin: log a pooja booking taken offline (cash/UPI at the counter). No
// Razorpay order is created — the booking is stored already confirmed with the
// payer snapshot inline. The receipt email is fire-and-forget and simply no-ops
// when the devotee gave no email.
export const createManualPoojaBooking = asyncHandler(async (req, res) => {
  const { poojaId, quantity, payer, bookingDate, amount, paymentMode } =
    req.validated.body;

  const result = await createManualPoojaBookingService({
    poojaId,
    quantity,
    payer,
    bookingDate,
    amount,
    paymentMode,
  });

  sendPoojaReceiptService(result.bookingId).catch(() => {});

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, result, "Pooja booking recorded"),
    );
});

// Admin: transition a booking's status from the dashboard (confirm / mark
// completed / cancel). `status` is restricted to the admin-settable subset by
// the validator.
export const updatePoojaBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const booking = await updatePoojaBookingStatusService({
    bookingId: id,
    status,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, booking, "Booking status updated"));
});

// Admin: list every pooja booking (newest first). Optional filters:
// `?status=pending|confirmed|completed|cancelled|failed`, a
// `?from=YYYY-MM-DD&to=YYYY-MM-DD` createdAt date range, and `?page`/`?limit`.
export const getAllPoojaBookings = asyncHandler(async (req, res) => {
  const { status, from, to, page, limit } = req.query;

  const { bookings, pagination } = await getAllPoojaBookingsService({
    status,
    from,
    to,
    page,
    limit,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { bookings, pagination },
        bookings.length ? "All pooja bookings" : "No bookings found",
      ),
    );
});

// --- Room bookings ----------------------------------------------------------
// Public checkout: the guest picks a room type + quantity; the server prices it
// from the catalogue and returns a Razorpay order.
export const bookRoom = asyncHandler(async (req, res) => {
  const { roomId, quantity, payer } = req.validated.body;

  const result = await createRoomBookingService({
    roomId,
    quantity,
    payer,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, "Room booking created"));
});

// Step 2: called after Razorpay Checkout completes. Signature verification is
// delegated to the payments module; we then confirm the booking here so the
// response reflects the final status immediately (the webhook subscriber covers
// the case where this call never happens).
export const verifyRoomBooking = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.validated.body;

  const payment = await verifyPaymentService({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  const booking = await RoomBooking.findOneAndUpdate(
    { payment: payment.paymentId },
    { status: "confirmed" },
    { returnDocument: "after" },
  )
    .populate("room", "roomType price")
    .lean();

  if (booking?._id) {
    sendRoomReceiptService(booking._id).catch(() => {});
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, { payment, booking }, "Payment verified"),
    );
});

// Admin: list every room booking (newest first). Optional filters:
// `?status=`, `?stayStatus=`, a `?from=&to=` createdAt range, and `?page`/`?limit`.
export const getAllRoomBookings = asyncHandler(async (req, res) => {
  const { status, stayStatus, from, to, page, limit } = req.query;

  const { bookings, pagination } = await getAllRoomBookingsService({
    status,
    stayStatus,
    from,
    to,
    page,
    limit,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { bookings, pagination },
        bookings.length ? "All room bookings" : "No bookings found",
      ),
    );
});

// Admin: check a confirmed booking in — decrements the room type's availability.
export const checkInRoom = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Booking id is required");

  const result = await checkInRoomBookingService({ bookingId: id });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, "Checked in successfully"));
});

// Admin: check a booking out — returns the room to the available pool.
export const checkOutRoom = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Booking id is required");

  const result = await checkOutRoomBookingService({ bookingId: id });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, "Checked out successfully"));
});
