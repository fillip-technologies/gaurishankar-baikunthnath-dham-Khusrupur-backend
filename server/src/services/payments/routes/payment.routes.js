import { Router } from "express";

import { validate } from "../../../middlewares/validate.middleware.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
} from "../../../validations/payment.validator.js";
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPayment,
} from "../controllers/payment.controller.js";

const paymentRouter = Router();

// Server-to-server callback from Razorpay. Must stay above the parameterised
// routes; authenticity is verified via the webhook signature.
paymentRouter.post("/webhook", handleWebhook);

// Standalone checkout — the payer submits their details with the order request,
// no authentication required. Domain services (e.g. booking) instead call
// createOrderService directly rather than going through this route.
paymentRouter.post(
  "/order",
  apiRateLimiter,
  validate(createOrderSchema),
  createOrder,
);

paymentRouter.post(
  "/verify",
  apiRateLimiter,
  validate(verifyPaymentSchema),
  verifyPayment,
);

paymentRouter.get("/:id", apiRateLimiter, getPayment);

export default paymentRouter;
