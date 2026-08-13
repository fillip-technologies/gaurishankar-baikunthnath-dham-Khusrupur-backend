import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { makeAdmin, DEFAULT_PASSWORD } from "../helpers/factories.js";

const BASE = "/api/v1/auth";

// NOTE: keep total /login calls in this file <= RATE_LIMIT_LOGIN_MAX (5).
describe("POST /login", () => {
  it("requires OTP on a new device and sets the challenge cookie", async () => {
    const user = await makeAdmin();
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresOtp).toBe(true);
    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toContain("loginChallenge");
  });

  it("returns 400 when the body fails validation", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "user@test.com" }); // missing password
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a wrong password", async () => {
    const user = await makeAdmin();
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: user.email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown email", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "ghost@test.com", password: "whatever" });
    expect(res.status).toBe(401);
  });
});
