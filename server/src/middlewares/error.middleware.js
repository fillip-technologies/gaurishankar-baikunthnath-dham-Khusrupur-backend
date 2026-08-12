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
      userId: req.user?.id,
    },
    "Unhandled application error"
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

    errors = Object.values(err.errors || {}).map(
      (error) => error.message
    );
  }

  else if (err?.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = "A record with the provided value already exists";
  }

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
  });
};