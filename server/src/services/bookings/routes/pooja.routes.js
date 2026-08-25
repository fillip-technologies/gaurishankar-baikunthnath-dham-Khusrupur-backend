import { Router } from "express";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  poojaSchema,
  updatePoojaSchema,
  bookPoojaSchema,
  manualPoojaBookingSchema,
  updatePoojaBookingStatusSchema,
  verifyPoojaBookingSchema,
} from "../../../validations/pooja.validator.js";
import {
  addPooja,
  getAllPooja,
  removePooja,
  updatePooja,
} from "../controllers/pooja.controller.js";
import {
  bookPooja,
  createManualPoojaBooking,
  updatePoojaBookingStatus,
  getAllPoojaBookings,
  verifyPoojaBooking,
} from "../controllers/booking.controller.js";

const poojaRouter = Router();

// --- Catalogue (admin) ---
poojaRouter.post(
  "/add",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(poojaSchema),
  addPooja,
);

poojaRouter.patch(
  "/update/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(updatePoojaSchema),
  updatePooja,
);

poojaRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  removePooja,
);

// --- Public ---
poojaRouter.get("/poojas", getAllPooja);

// --- Bookings (admin) ---
// List all pooja bookings for the dashboard. Optional filters:
// ?status=pending|confirmed|failed and ?from=YYYY-MM-DD&to=YYYY-MM-DD (date range).
poojaRouter.get(
  "/bookings",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  getAllPoojaBookings,
);

// Manually record an offline booking (cash/UPI at the counter). Admin-only:
// the server prices from the catalogue (with an optional amount override) and
// stores the booking already confirmed, with no Razorpay order.
poojaRouter.post(
  "/bookings/manual",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(manualPoojaBookingSchema),
  createManualPoojaBooking,
);

// Update a booking's status from the dashboard (confirm / complete / cancel).
poojaRouter.patch(
  "/bookings/:id/status",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(updatePoojaBookingStatusSchema),
  updatePoojaBookingStatus,
);

// --- Booking (public checkout) ---
// Anyone can book a pooja: the devotee picks a pooja + quantity; the server
// prices it and returns a Razorpay order.
poojaRouter.post(
  "/book",
  apiRateLimiter,
  validate(bookPoojaSchema),
  bookPooja,
);

// Called after Razorpay Checkout to verify the payment and confirm the booking.
poojaRouter.post(
  "/verify",
  apiRateLimiter,
  validate(verifyPoojaBookingSchema),
  verifyPoojaBooking,
);

export default poojaRouter;
