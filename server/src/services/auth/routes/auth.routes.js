import express from "express";
const authRouter = express.Router();

import {
  createAdmin,
  getAdmin,
  listAdmin,
  login,
  logOut,
  removeAdmin,
  renewRefreshToken,
  updatePassword,
  verifyLoginOtp,
} from "../controllers/auth.controller.js";

import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";

import { validate } from "../../../middlewares/validate.middleware.js";

import {
  apiRateLimiter,
  loginLimiter,
  otpLimiter,
} from "../../../middlewares/rateLimiter.middleware.js";

import {
  adminCreationSchema,
  loginSchema,
  otpSchema,
  passwordSchema,
  removeAdminSchema,
} from "../../../validations/auth.validator.js";

authRouter.post("/login", loginLimiter, validate(loginSchema), login);
authRouter.post(
  "/verify_login_otp",
  otpLimiter,
  validate(otpSchema),
  verifyLoginOtp,
);

authRouter.post(
  "/create_admin",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(adminCreationSchema),
  createAdmin,
);

authRouter.post("/refresh_token", apiRateLimiter, renewRefreshToken);

authRouter.patch(
  "/update_password",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(passwordSchema),
  updatePassword,
);

authRouter.get(
  "/admins",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  listAdmin,
);

authRouter.get(
  "/profile/:id",
  apiRateLimiter,
  authenticate,
  getAdmin,
);
authRouter.post(
  "/logout",
  authenticate,
  logOut,
);
authRouter.delete(
  "/remove_admin",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  validate(removeAdminSchema),
  removeAdmin,
);


export { authRouter };
