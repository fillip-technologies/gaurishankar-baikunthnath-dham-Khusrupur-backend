import rateLimit from "express-rate-limit";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";

const minutes = (n) => n * 60 * 1000;

// Thresholds are env-configurable so tests can force a low limit without
// hammering the real defaults.
const LOGIN_MAX = Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5;
const OTP_MAX = Number(process.env.RATE_LIMIT_OTP_MAX) || 10;
const WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15;

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Maximum 100 requests per IP per window
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    success: false,
    message: "Too many requests. Please try again later.",
    errors: [],
  },
});

// Brute-force protection for credential submission.
export const loginLimiter = rateLimit({
  windowMs: minutes(WINDOW_MINUTES),
  limit: LOGIN_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    success: false,
    message: "Too many login attempts. Please try again later.",
    errors: [],
  },
});

// Brute-force protection for OTP verification (a 6-digit code is guessable
// without this).
export const otpLimiter = rateLimit({
  windowMs: minutes(WINDOW_MINUTES),
  limit: OTP_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    success: false,
    message: "Too many verification attempts. Please try again later.",
    errors: [],
  },
});
