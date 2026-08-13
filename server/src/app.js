import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import { envConfig } from "./configs/env.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./services/auth/routes/auth.routes.js";
import ApiError from "./utils/ApiError.js";
import { HTTP_STATUS } from "./constants/httpStatus.constants.js";

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

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);

// Unmatched routes → 404 (handled by errorHandler below).
app.use((req, res, next) => {
  next(new ApiError(HTTP_STATUS.NOT_FOUND, "Route not found"));
});

// MUST be last
app.use(errorHandler);

export default app;
