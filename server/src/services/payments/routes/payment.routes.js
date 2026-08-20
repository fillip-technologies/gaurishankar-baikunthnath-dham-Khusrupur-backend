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
  getAllPayment,
} from "../controllers/payment.controller.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";

const paymentRouter = Router();


paymentRouter.post("/webhook", handleWebhook);


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


paymentRouter.get(
  "/all",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  getAllPayment,
);

paymentRouter.get(
  "/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  getPayment,
);
export default paymentRouter;
