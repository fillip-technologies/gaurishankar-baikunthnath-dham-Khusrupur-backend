import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { envConfig } from "./configs/env.config.js";
import logger from "./utils/logger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./services/auth/routes/auth.routes.js";
import ApiError from "./utils/ApiError.js";
import { HTTP_STATUS } from "./constants/httpStatus.constants.js";
import addressRouter from "./services/auth/routes/address.routes.js";
import mediaRouter from "./services/media/routes/gallery.routes.js";
import paymentRouter from "./services/payments/routes/payment.routes.js";
import prasadRouter from "./services/bookings/routes/prasad.routes.js";
import shringarRouter from "./services/media/routes/shringar.routes.js";
import eventRouter from "./services/media/routes/event.routes.js";
import "./services/bookings/subscribers/prasadBooking.subscriber.js";


const app = express();

const allowedOrigins = envConfig.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(helmet());
app.use(
  pinoHttp({
    logger,
    // Don't log health-check or favicon noise
    autoLogging: {
      ignore: (req) => req.url === "/health" || req.url === "/favicon.ico",
    },
    // Customize the log message for each request
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} → ${res.statusCode} (${err.message})`,
    // Strip verbose fields to keep dev logs clean
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/prasad", prasadRouter);
app.use("/api/v1/shringar", shringarRouter);
app.use("/api/v1/event", eventRouter);


app.use((req, res, next) => {
  next(new ApiError(HTTP_STATUS.NOT_FOUND, "Route not found"));
});

// MUST be last
app.use(errorHandler);

export default app;
