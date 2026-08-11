import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { Admin } from "../models/auth.model.js";
import ApiError from "../utils/ApiError.js";
import { envConfig } from "../config/env.config.js";
import { generateAndSendOtp, sendAdminCredentials } from "./mail.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const issueSession = async (user, { deviceHash, userAgent, ip }) => {
  user.sessionId = crypto.randomUUID();
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;

  if (deviceHash) {
    const existing = user.trustedDevices.find(
      (d) => d.deviceHash === deviceHash,
    );
    if (existing) {
      existing.lastUsedAt = new Date();
    } else {
      user.trustedDevices.push({
        deviceHash,
        userAgent,
        ip,
        lastUsedAt: new Date(),
      });
    }
  }

  await user.save({ validateBeforeSave: false });
  return { user, accessToken, refreshToken };
};

export const loginService = async ({ email, password, deviceId, userAgent, ip }) => {
  const user = await Admin.findOne({ email }).select(
    "+password +trustedDevices",
  );
  if (!user)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");

  const deviceHash = deviceId ? hashValue(deviceId) : null;
  const isTrustedDevice =
    deviceHash && user.trustedDevices.some((d) => d.deviceHash === deviceHash);

  // New / unrecognized device → require email OTP before issuing any session.
  if (!isTrustedDevice) {
    await generateAndSendOtp(user);

    
    const challengeToken = jwt.sign(
      { _id: user._id, purpose: "login_otp" },
      envConfig.ACCESS_TOKEN_SECRET,
      { expiresIn: "10m" },
    );

    return { requiresOtp: true, email: user.email, challengeToken };
  }

  // Trusted device → normal login.
  const session = await issueSession(user, { deviceHash, userAgent, ip });
  return { requiresOtp: false, deviceId, ...session };
};

// Completes a new-device login: validates the challenge + OTP, then trusts the
// device and issues the session.
export const verifyLoginOtpService = async ({
  challengeToken,
  otp,
  deviceId,
  userAgent,
  ip,
}) => {
  if (!challengeToken)
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Login session expired. Please login again.",
    );

  let decoded;
  try {
    decoded = jwt.verify(challengeToken, envConfig.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Login session expired. Please login again.",
    );
  }

  if (decoded.purpose !== "login_otp")
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid request");

  const user = await Admin.findById(decoded._id).select(
    "+loginOtp +trustedDevices",
  );
  if (!user) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");

  if (!user.loginOtp || !user.otpExpiry)
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "No OTP request found. Please login again.",
    );

  if (user.otpExpiry.getTime() < Date.now()) {
    user.loginOtp = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "OTP has expired. Please login again.",
    );
  }

  if (hashValue(otp) !== user.loginOtp)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid OTP");

  // OTP correct → clear it and trust this device.
  user.loginOtp = undefined;
  user.otpExpiry = undefined;

  const newDeviceId = deviceId || crypto.randomUUID();
  const deviceHash = hashValue(newDeviceId);

  const session = await issueSession(user, { deviceHash, userAgent, ip });
  return { ...session, deviceId: newDeviceId };
};

export const updatePasswordService = async ({
  current_password,
  newpassword,
  decoded,
}) => {
  const user = await Admin.findById(decoded?._id).select("+password");

  if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User doesn't exist");

  const isPasswordCorrect = await user.comparePassword(current_password);

  if (!isPasswordCorrect)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid password");

  user.password = newpassword;
  await user.save({ validateBeforeSave: true });
  return user;
};

export const createAdminService = async ({
  fullname,
  mobile_number,
  email,
  password,
}) => {
  const existingUser = await Admin.findOne({ email }).lean();

  if (existingUser)
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "User with this email already exist",
    );

  const user = await Admin.create({
    fullname: fullname,
    mobile_number: mobile_number,
    email: email,
    password: password,
  });

  // Email the new admin their credentials. If delivery fails, roll back the
  // creation so the superadmin can retry cleanly (mirrors the OTP flow).
  try {
    await sendAdminCredentials({
      name: user.fullname,
      email: user.email,
      password,
    });
  } catch (error) {
    await user.deleteOne();
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Admin was not created: unable to send the credentials email. Please try again.",
    );
  }

  return user;
};

export const removeAdminService = async ({
  adminEmail,
  superAdminPassword,
  superAdminId,
}) => {
  const superAdmin = await Admin.findById(superAdminId).select("+password");
  if (!superAdmin) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  if (superAdmin.role !== "superadmin") {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Request forbidden");
  }

  if (superAdmin.email === adminEmail) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "You cannot delete your own account",
    );
  }
  const targetAdmin = await Admin.findOne({ email: adminEmail });
  console.log(targetAdmin);
  if (!targetAdmin) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");
  }

  if (targetAdmin.role === "superadmin") {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Super admin cannot be deleted");
  }

  const isPasswordCorrect =
    await superAdmin.comparePassword(superAdminPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Incorrect password");
  }

  await targetAdmin.deleteOne();

  return true;
};

export const refreshTokenService = async (inComingRefreshToken) => {
  
    if (!inComingRefreshToken)
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not Authorized");

    const decoded = jwt.verify(
      inComingRefreshToken,
      envConfig.REFRESH_TOKEN_SECRET,
    );

    const admin = await Admin.findById(decoded._id).select(
      "+refreshToken +sessionId",
    );

    if (!admin) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not Authorized");

    if (admin.refreshToken !== inComingRefreshToken)
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Login session Expired");

    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });
    return {
      accessToken,
      refreshToken,
    };
  
};
