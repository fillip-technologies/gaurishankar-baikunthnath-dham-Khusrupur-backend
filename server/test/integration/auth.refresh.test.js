import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { makeAdmin, authAndRefreshCookies } from "../helpers/factories.js";

const BASE = "/api/v1/auth";

describe("POST /refresh_token", () => {
  it("rotates tokens using only the refresh cookie (no access token required)", async () => {
    const user = await makeAdmin();
    const [, refreshCookie] = await authAndRefreshCookies(user);

    // Deliberately send ONLY the refresh cookie — simulates an expired access token.
    const res = await request(app)
      .post(`${BASE}/refresh_token`)
      .set("Cookie", refreshCookie);

    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toContain("accessToken");
    expect(cookies).toContain("refreshToken");
  });

  it("rejects a request with no refresh token (401)", async () => {
    const res = await request(app).post(`${BASE}/refresh_token`);
    expect(res.status).toBe(401);
  });
});
