import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import { envConfig } from "./configs/env.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./services/auth/routes/auth.routes.js";
import ApiError from "./utils/ApiError.js";
import { HTTP_STATUS } from "./constants/httpStatus.constants.js";
import addressRouter from "./services/auth/routes/address.routes.js";
import mediaRouter from "./services/media/routes/gallery.routes.js";
import paymentRouter from "./services/payments/routes/payment.routes.js";
import  prasadRouter  from "./services/bookings/routes/prasad.routes.js";

const app = express();

const allowedOrigins = envConfig.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

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
    // Keep the raw payload so the Razorpay webhook can verify its HMAC signature.
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
// Unmatched routes → 404 (handled by errorHandler below).
app.use((req, res, next) => {
  next(new ApiError(HTTP_STATUS.NOT_FOUND, "Route not found"));
});

// MUST be last
app.use(errorHandler);

export default app;
