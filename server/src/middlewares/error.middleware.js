import multer from "multer";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
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

  
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let errors = [];

  
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

 
  else if (err?.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid ${err.path || "value"}`;
  }

  else if (err?.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = "A record with the provided value already exists";
  }

  
  else if (err?.type === "entity.parse.failed") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Invalid request body";
  }

  
  else if (
    err?.name === "JsonWebTokenError" ||
    err?.name === "TokenExpiredError" ||
    err?.name === "NotBeforeError"
  ) {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Not authorized";
  }

  
  else if (err?.statusCode || err?.status) {
    statusCode = err.statusCode || err.status;
    if (statusCode >= 400 && statusCode < 500) {
      message = err.message || "Bad request";  
    }
  
  }

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
  });
};