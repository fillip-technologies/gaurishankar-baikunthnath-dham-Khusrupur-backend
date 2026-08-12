import crypto from "crypto";

import { transporter } from "../../../configs/mail.config.js";
import { envConfig } from "../../../configs/env.config.js";
import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import { otpTemplate } from "../../../templates/otp.template.js";
import { crendentialsTemplate } from "../../../templates/adminCredentialsTemplate.js";
import ApiError from "../../../utils/ApiError.js";
import { generateOTP } from "../../../utils/generateOTP.js";

const sendMail = async ({ name, email, otp }) => {
  await transporter.sendMail({
    from: `"Shree Gaurishankar Baikunthdham Temple" <${envConfig.MAIL_FROM}>`,
    to: email,
    subject: "OTP Verification - Shree Gaurishankar Baikunthdham Temple",
    html: otpTemplate(name, otp),
  });
};

// Generates an OTP, stores its hash + expiry on the given admin document, and
// emails the plaintext OTP. Reused by the OTP request and new-device login flows.
export const generateAndSendOtp = async (admin) => {
  const otp = generateOTP();

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  admin.loginOtp = hashedOtp;
  admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await admin.save({ validateBeforeSave: false });

  try {
    await sendMail({
      name: admin.fullname,
      email: admin.email,
      otp,
    });
  } catch (error) {
    admin.loginOtp = undefined;
    admin.otpExpiry = undefined;

    await admin.save({ validateBeforeSave: false });

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Unable to send OTP. Please try again.",
    );
  }

  return true;
};

// Emails a newly created admin their login credentials. Errors propagate so the
// caller (createAdminService) can roll back the creation and report failure.
export const sendAdminCredentials = async ({ name, email, password }) => {
  await transporter.sendMail({
    from: `"Shree Gaurishankar Baikunthdham Temple" <${envConfig.MAIL_FROM}>`,
    to: email,
    subject:
      "Your Admin Account Credentials - Shree Gaurishankar Baikunthdham Temple",
    html: crendentialsTemplate(name, email, password),
  });

  return true;
};
