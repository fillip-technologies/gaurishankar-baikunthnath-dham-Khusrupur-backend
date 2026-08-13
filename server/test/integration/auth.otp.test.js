import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Admin } from "../../src/services/auth/models/user.model.js";
import { makeAdmin, DEFAULT_PASSWORD } from "../helpers/factories.js";

// Deterministic OTP so the success path is testable.
vi.mock("../../src/utils/generateOTP.js", () => ({
  generateOTP: () => "123456",
}));

const BASE = "/api/v1/auth";

// Drives login on a fresh device (agent = new cookie jar) and returns the agent
// holding the loginChallenge cookie.
const startLogin = async (user) => {
  const agent = request.agent(app);
  await agent
    .post(`${BASE}/login`)
    .send({ email: user.email, password: DEFAULT_PASSWORD });
  return agent;
};

describe("POST /verify_login_otp", () => {
  it("completes login with the correct OTP, sets httpOnly cookies, no password leak", async () => {
    const user = await makeAdmin();
    const agent = await startLogin(user);

    const res = await agent.post(`${BASE}/verify_login_otp`).send({ otp: "123456" });

    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"];
    const access = cookies.find((c) => c.startsWith("accessToken="));
    expect(access).toBeDefined();
    expect(access).toMatch(/HttpOnly/i);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.user).not.toHaveProperty("refreshToken");
  });

  it("returns 401 for a wrong OTP", async () => {
    const user = await makeAdmin();
    const agent = await startLogin(user);
    const res = await agent.post(`${BASE}/verify_login_otp`).send({ otp: "000000" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid OTP");
  });

  it("returns 400 when the OTP has expired", async () => {
    const user = await makeAdmin();
    const agent = await startLogin(user);
    // Force expiry.
    await Admin.updateOne(
      { _id: user._id },
      { $set: { otpExpiry: new Date(Date.now() - 1000) } },
    );
    const res = await agent.post(`${BASE}/verify_login_otp`).send({ otp: "123456" });
    expect(res.status).toBe(400);
  });

  it("locks the OTP after too many wrong attempts", async () => {
    const user = await makeAdmin();
    const agent = await startLogin(user);
    const max = Number(process.env.MAX_OTP_ATTEMPTS);

    let last;
    for (let i = 0; i < max; i++) {
      last = await agent.post(`${BASE}/verify_login_otp`).send({ otp: "000000" });
    }
    expect(last.status).toBe(401);
    expect(last.body.message).toBe("Too many invalid attempts. Please login again.");
  });
});
