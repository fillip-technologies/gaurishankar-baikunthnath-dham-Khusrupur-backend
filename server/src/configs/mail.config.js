import nodemailer from "nodemailer";
import { envConfig } from "./env.config.js";

export const transporter = nodemailer.createTransport({
  host: envConfig.MAIL_HOST,
  port: Number(envConfig.MAIL_PORT),
  secure: false,
  auth: { user: envConfig.MAIL_USER, pass: envConfig.MAIL_PASSWORD },
});
transporter.verify((error) => {
  if (error) {
    console.error("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready");
  }
});


