import { Router } from "express";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { addressSchema } from "../../../validations/address.validator.js";
import { getAddress, updateAddress } from "../controllers/address.controller.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";

const addressRouter = Router();

// Mounted at /api/v1/addresses (see app.js). All routes live at the mount root.

addressRouter.post(
  "/",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(addressSchema),
  updateAddress,
);

addressRouter.patch(
  "/",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(addressSchema),
  updateAddress,
);

addressRouter.get("/", apiRateLimiter, authenticate, getAddress);

export default addressRouter;
