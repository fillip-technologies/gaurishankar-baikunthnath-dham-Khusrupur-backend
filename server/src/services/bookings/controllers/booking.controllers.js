import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { verifyPaymentService } from "../../payments/services/payment.services.js";
import {
  createPrasadBookingService,
  getAllPrasadBookingsService,
} from "../services/prasadBooking.services.js";
import { sendPrasadReceiptService } from "../services/prasadReceipt.services.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";


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
