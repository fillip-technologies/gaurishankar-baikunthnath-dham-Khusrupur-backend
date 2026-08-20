import nodemailer from "nodemailer";
import { envConfig } from "./env.config.js";
import logger from "../utils/logger.js";

export const transporter = nodemailer.createTransport({
  host: envConfig.MAIL_HOST,
  port: Number(envConfig.MAIL_PORT),
  secure: false,
  auth: { user: envConfig.MAIL_USER, pass: envConfig.MAIL_PASSWORD },
});
transporter.verify((error) => {
  if (error) {
    logger.error({ err: error }, "SMTP verification failed");
  } else {
    logger.info("✅ SMTP Server is ready");
  }
});
