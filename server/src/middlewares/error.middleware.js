import multer from "multer";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  // Always log the FULL error server-side (stack, details) — never sent to client
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?._id,
    },
    "Application error"
  );

  // Defaults for a truly UNKNOWN error: honest 500 + generic message
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let errors = [];

  // --- Known, trusted errors: safe to expose status + message ---
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors ?? [];
  }

  else if (err instanceof multer.MulterError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = err.message;
  }

  else if (err?.name === "ValidationError") {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = "Validation failed";
    errors = Object.values(err.errors || {}).map((e) => e.message);
  }

  // --- Malformed ObjectId / bad query cast (Mongoose CastError) → 400 ---
  else if (err?.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid ${err.path || "value"}`;
  }

  else if (err?.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = "A record with the provided value already exists";
  }

  // --- Malformed JSON body (body-parser) ---
  else if (err?.type === "entity.parse.failed") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Invalid request body";
  }

  // --- Invalid / expired JWT (jsonwebtoken) → 401 so clients can refresh ---
  else if (
    err?.name === "JsonWebTokenError" ||
    err?.name === "TokenExpiredError" ||
    err?.name === "NotBeforeError"
  ) {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Not authorized";
  }

  // --- Generic fallback for any HTTP-aware error (http-errors, etc.) ---
  // Honor the status code, but only expose the message for CLIENT errors (4xx).
  else if (err?.statusCode || err?.status) {
    statusCode = err.statusCode || err.status;
    if (statusCode >= 400 && statusCode < 500) {
      message = err.message || "Bad request";   // 4xx: message is safe-ish
    }
    // 5xx: keep the generic "Internal server error" — don't leak internals
  }

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
  });
};