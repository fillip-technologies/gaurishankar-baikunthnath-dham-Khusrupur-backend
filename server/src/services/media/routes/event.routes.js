import { Router } from "express";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import eventSchema, {
  eventDateQuerySchema,
  eventUpdateSchema,
} from "../../../validations/event.validator.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import {
  createEvent,
  deleteEvent,
  getEventsByDate,
  getTodayEvent,
  updateEvent,
} from "../controllers/event.controller.js";
const eventRouter = Router();

eventRouter.post(
  "/create",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(eventSchema),
  createEvent,
);

eventRouter.put(
  "/update/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(eventUpdateSchema),
  updateEvent,
);

eventRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  deleteEvent,
);

// Today's events.
eventRouter.get("/today", apiRateLimiter, getTodayEvent);

// Events on a chosen date, e.g. /?date=2026-08-21
eventRouter.get("/", apiRateLimiter, validate(eventDateQuerySchema), getEventsByDate);

export default eventRouter;
