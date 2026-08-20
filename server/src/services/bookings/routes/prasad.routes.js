import { Router } from "express";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import {
  addPrasadSchema,
  bookPrasadSchema,
  verifyPrasadBookingSchema,
} from "../../../validations/prasad.validator.js";
import {
  addPrasad,
  getAllPrasad,
  removePrasad,
} from "../controllers/prasad.controllers.js";
import {
  bookPrasad,
  getAllBookings,
  verifyPrasadBooking,
} from "../controllers/booking.controllers.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";

const prasadRouter = Router();

// --- Catalogue (admin) ---
prasadRouter.post(
  "/add",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(addPrasadSchema),
  addPrasad,
);

prasadRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  removePrasad,
);

prasadRouter.get("/prasads",  getAllPrasad);

// --- Bookings (admin) ---
// List all prasad bookings for the dashboard. Optional filters:
// ?status=pending|confirmed|failed and ?from=YYYY-MM-DD&to=YYYY-MM-DD (date range).
prasadRouter.get(
  "/bookings",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  getAllBookings,
);

// --- Booking (public checkout) ---
// Customer picks a prasad + quantity; the server prices it and returns a
// Razorpay order.
prasadRouter.post(
  "/book",
  apiRateLimiter,
  validate(bookPrasadSchema),
  bookPrasad,
);

// Called after Razorpay Checkout to verify the payment and confirm the booking.
prasadRouter.post(
  "/verify",
  apiRateLimiter,
  validate(verifyPrasadBookingSchema),
  verifyPrasadBooking,
);

export default prasadRouter;
