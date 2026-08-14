import { Router } from "express";
import { authenticate } from "../../../middlewares/verifyToken.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { addressSchema } from "../../../validations/address.validator.js";
import { getAddress, updateAddress } from "../controllers/address.controller.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";

const addressRouter = Router();

addressRouter.post(
  "/address",
  apiRateLimiter,
  authenticate,
  validate(addressSchema),
  updateAddress,
);

addressRouter.get("/address", apiRateLimiter, authenticate, getAddress);

export default addressRouter;
