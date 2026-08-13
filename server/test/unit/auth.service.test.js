import { describe, it, expect } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  loginService,
  verifyLoginOtpService,
  createAdminService,
  removeAdminService,
  refreshTokenService,
  updatePasswordService,
} from "../../src/services/auth/services/auth.service.js";
import { Admin } from "../../src/services/auth/models/user.model.js";
import { makeAdmin, makeSuperadmin, DEFAULT_PASSWORD } from "../helpers/factories.js";

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

const seedOtp = async (user, otp = "123456") => {
  user.loginOtp = sha256(otp);
  user.otpExpiry = new Date(Date.now() + 60_000);
  user.loginOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });
};

const challengeFor = (user) =>
  jwt.sign(
    { _id: user._id, purpose: "login_otp" },
    process.env.CHALLENGE_TOKEN_SECRET,
    { expiresIn: "5m" },
  );

describe("loginService", () => {
  it("throws 401 for an unknown email", async () => {
    await expect(
      loginService({ email: "nobody@test.com", password: "x" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws the same 401 message for a wrong password (no enumeration)", async () => {
    const user = await makeAdmin();
    const unknown = await loginService({
      email: "ghost@test.com",
      password: "whatever",
    }).catch((e) => e);
    const wrongPass = await loginService({
      email: user.email,
      password: "wrongpass",
    }).catch((e) => e);
    expect(unknown.message).toBe(wrongPass.message);
    expect(wrongPass.statusCode).toBe(401);
  });

  it("requires OTP on a new device", async () => {
    const user = await makeAdmin();
    const result = await loginService({
      email: user.email,
      password: DEFAULT_PASSWORD,
    });
    expect(result.requiresOtp).toBe(true);
    expect(result.challengeToken).toBeTruthy();
    const fresh = await Admin.findById(user._id).select("+loginOtp");
    expect(fresh.loginOtp).toBeTruthy();
  });
});

describe("verifyLoginOtpService", () => {
  it("rejects when no challenge token is present", async () => {
    await expect(
      verifyLoginOtpService({ otp: "123456" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("issues a session on the correct OTP and clears it", async () => {
    const user = await makeAdmin();
    await seedOtp(user, "123456");
    const result = await verifyLoginOtpService({
      challengeToken: challengeFor(user),
      otp: "123456",
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    const fresh = await Admin.findById(user._id).select("+loginOtp");
    expect(fresh.loginOtp).toBeUndefined();
  });

  it("locks out after too many wrong OTPs and invalidates the OTP", async () => {
    const user = await makeAdmin();
    await seedOtp(user, "123456");
    const token = challengeFor(user);
    const max = Number(process.env.MAX_OTP_ATTEMPTS);

    for (let i = 1; i < max; i++) {
      await expect(
        verifyLoginOtpService({ challengeToken: token, otp: "000000" }),
      ).rejects.toMatchObject({ statusCode: 401, message: "Invalid OTP" });
    }
    // The Nth wrong attempt triggers lockout.
    await expect(
      verifyLoginOtpService({ challengeToken: token, otp: "000000" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Too many invalid attempts. Please login again.",
    });
    // OTP is now cleared — even the correct code no longer works.
    await expect(
      verifyLoginOtpService({ challengeToken: token, otp: "123456" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("createAdminService", () => {
  it("creates a new admin", async () => {
    const admin = await createAdminService({
      fullname: "New Admin",
      mobile_number: "9998887770",
      email: "new@test.com",
      password: "secret123",
    });
    expect(admin.email).toBe("new@test.com");
  });

  it("throws 409 for a duplicate email", async () => {
    await makeAdmin({ email: "dup@test.com" });
    await expect(
      createAdminService({
        fullname: "Dup",
        mobile_number: "9998887770",
        email: "dup@test.com",
        password: "secret123",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("removeAdminService", () => {
  it("removes a target admin", async () => {
    const superAdmin = await makeSuperadmin();
    const target = await makeAdmin({ email: "target@test.com" });
    const ok = await removeAdminService({
      adminEmail: target.email,
      superAdminPassword: DEFAULT_PASSWORD,
      superAdminId: superAdmin._id,
    });
    expect(ok).toBe(true);
    expect(await Admin.findById(target._id)).toBeNull();
  });

  it("forbids self-deletion", async () => {
    const superAdmin = await makeSuperadmin({ email: "boss@test.com" });
    await expect(
      removeAdminService({
        adminEmail: superAdmin.email,
        superAdminPassword: DEFAULT_PASSWORD,
        superAdminId: superAdmin._id,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects a wrong superadmin password", async () => {
    const superAdmin = await makeSuperadmin();
    const target = await makeAdmin();
    await expect(
      removeAdminService({
        adminEmail: target.email,
        superAdminPassword: "wrong",
        superAdminId: superAdmin._id,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("refreshTokenService", () => {
  it("rotates tokens for a valid refresh token", async () => {
    const user = await makeAdmin();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const result = await refreshTokenService(refreshToken);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("throws 401 for an invalid refresh token", async () => {
    await expect(refreshTokenService("garbage")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("throws 401 when the stored refresh token no longer matches", async () => {
    const user = await makeAdmin();
    const refreshToken = user.generateRefreshToken();
    // Not stored on the user → mismatch.
    await expect(refreshTokenService(refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe("updatePasswordService", () => {
  it("updates the password with the correct current password", async () => {
    const user = await makeAdmin();
    await updatePasswordService({
      current_password: DEFAULT_PASSWORD,
      newpassword: "brandnew1",
      decoded: { _id: user._id },
    });
    const fresh = await Admin.findById(user._id).select("+password");
    expect(await fresh.comparePassword("brandnew1")).toBe(true);
  });

  it("rejects a wrong current password", async () => {
    const user = await makeAdmin();
    await expect(
      updatePasswordService({
        current_password: "wrong",
        newpassword: "brandnew1",
        decoded: { _id: user._id },
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
