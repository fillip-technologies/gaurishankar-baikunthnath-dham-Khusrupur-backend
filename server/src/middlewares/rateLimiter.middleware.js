import rateLimit from "express-rate-limit";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { envConfig } from "../configs/env.config.js";

const minutes = (n) => n * 60 * 1000;


const LOGIN_MAX = Number(envConfig.RATE_LIMIT_LOGIN_MAX) || 5;
const OTP_MAX = Number(envConfig.RATE_LIMIT_OTP_MAX) || 10;
const WINDOW_MINUTES = Number(envConfig.RATE_LIMIT_WINDOW_MINUTES) || 15;

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100, 
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    success: false,
    message: "Too many requests. Please try again later.",
    errors: [],
  },
});


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
