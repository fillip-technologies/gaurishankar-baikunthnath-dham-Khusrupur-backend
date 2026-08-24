import { Router } from "express";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  addRoomSchema,
  updateRoomSchema,
  bookRoomSchema,
  verifyRoomBookingSchema,
} from "../../../validations/room.validator.js";
import {
  addRoom,
  getAllRoom,
  removeRoom,
  updateRoom,
} from "../controllers/room.controller.js";
import {
  bookRoom,
  getAllRoomBookings,
  verifyRoomBooking,
  checkInRoom,
  checkOutRoom,
} from "../controllers/booking.controller.js";

const roomRouter = Router();

// --- Catalogue (admin) ---
roomRouter.post(
  "/add",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(addRoomSchema),
  addRoom,
);

roomRouter.patch(
  "/update/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(updateRoomSchema),
  updateRoom,
);

roomRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  removeRoom,
);

// --- Public ---
roomRouter.get("/rooms", getAllRoom);

// --- Bookings (admin) ---
// List all room bookings for the dashboard. Optional filters:
// ?status=pending|confirmed|failed, ?stayStatus=booked|checked_in|checked_out,
// and ?from=YYYY-MM-DD&to=YYYY-MM-DD (date range).
roomRouter.get(
  "/bookings",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  getAllRoomBookings,
);

// --- Check-in / check-out (admin) ---
// Adjust the room type's availability on the ground: check-in decrements it,
// check-out increments it back.
roomRouter.patch(
  "/checkin/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  checkInRoom,
);

roomRouter.patch(
  "/checkout/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  checkOutRoom,
);

// --- Booking (public checkout) ---
// Anyone can book a room: the guest picks a room type + quantity; the server
// prices it and returns a Razorpay order.
roomRouter.post(
  "/book",
  apiRateLimiter,
  validate(bookRoomSchema),
  bookRoom,
);

// Called after Razorpay Checkout to verify the payment and confirm the booking.
roomRouter.post(
  "/verify",
  apiRateLimiter,
  validate(verifyRoomBookingSchema),
  verifyRoomBooking,
);

export default roomRouter;
