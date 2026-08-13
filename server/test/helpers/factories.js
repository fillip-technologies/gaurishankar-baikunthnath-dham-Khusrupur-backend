import crypto from "crypto";
import { Admin } from "../../src/services/auth/models/user.model.js";

// Default credentials reused across tests.
export const DEFAULT_PASSWORD = "Admin@123";

let counter = 0;
const uniqueEmail = () => `user${Date.now()}_${counter++}@test.com`;

// Creates an admin document. Pass overrides for role/email/etc.
export const makeAdmin = async (overrides = {}) => {
  return Admin.create({
    fullname: overrides.fullname || "Test Admin",
    mobile_number: overrides.mobile_number || "9876543210",
    email: overrides.email || uniqueEmail(),
    password: overrides.password || DEFAULT_PASSWORD,
    role: overrides.role || "admin",
    ...("sessionId" in overrides ? { sessionId: overrides.sessionId } : {}),
  });
};

export const makeSuperadmin = (overrides = {}) =>
  makeAdmin({ ...overrides, role: "superadmin" });

// Mints a valid access-token cookie for a user, establishing a live session so
// requireValidSession passes. Returns the Cookie header string. Avoids driving
// the full OTP login flow just to authenticate a request.
export const authCookieFor = async (user) => {
  user.sessionId = crypto.randomUUID();
  await user.save({ validateBeforeSave: false });
  const token = user.generateAccessToken();
  return `accessToken=${token}`;
};

// Mints a matching access + refresh cookie pair (for the refresh-token route,
// which requires a valid access token AND a stored refresh token).
export const authAndRefreshCookies = async (user) => {
  user.sessionId = crypto.randomUUID();
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`];
};
