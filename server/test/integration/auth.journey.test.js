import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { makeSuperadmin, DEFAULT_PASSWORD } from "../helpers/factories.js";

// Deterministic OTP so the new-device flow is drivable end-to-end (mirrors
// auth.otp.test.js). In real life this arrives by email.
vi.mock("../../src/utils/generateOTP.js", () => ({
  generateOTP: () => "123456",
}));

const BASE = "/api/v1/auth";

// Pull a single cookie's value out of a Set-Cookie header array.
const readCookie = (setCookie, name) => {
  const list = Array.isArray(setCookie) ? setCookie : [setCookie].filter(Boolean);
  const hit = list.find((c) => c.startsWith(`${name}=`));
  return hit ? hit.split(";")[0].split("=")[1] : undefined;
};

/**
 * Full auth journey, driven exactly the way the frontend (allApi.js) drives it:
 * login -> OTP -> authenticated calls -> refresh -> logout -> trusted re-login.
 * `request.agent` keeps a cookie jar just like a browser, so httpOnly auth
 * cookies flow automatically between steps.
 *
 * Kept to 4 /login calls to stay under the 5-per-window login rate limit.
 */
describe("Auth journey (frontend-driven)", () => {
  it("walks the complete login → OTP → session → refresh → logout lifecycle", async () => {
    const user = await makeSuperadmin();
    const agent = request.agent(app);

    // ── 1. Wrong password is rejected ─────────────────────────────────────
    const badPass = await agent
      .post(`${BASE}/login`)
      .send({ email: user.email, password: "WrongPass@1" });
    expect(badPass.status).toBe(401);
    expect(badPass.body.message).toMatch(/invalid email or password/i);

    // ── 2. Unknown email is rejected (same generic message, no user enumeration)
    const badEmail = await agent
      .post(`${BASE}/login`)
      .send({ email: "nobody@test.com", password: DEFAULT_PASSWORD });
    expect(badEmail.status).toBe(401);

    // ── 3. Valid creds on a new device → OTP challenge, no session yet ─────
    const login = await agent
      .post(`${BASE}/login`)
      .send({ email: user.email, password: DEFAULT_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.requiresOtp).toBe(true);
    expect(readCookie(login.headers["set-cookie"], "loginChallenge")).toBeDefined();
    // No session cookies until OTP is verified.
    expect(readCookie(login.headers["set-cookie"], "accessToken")).toBeUndefined();

    // ── 4. Verify OTP → httpOnly session cookies, sanitized user ───────────
    const verify = await agent.post(`${BASE}/verify_login_otp`).send({ otp: "123456" });
    expect(verify.status).toBe(200);
    const verifyCookies = verify.headers["set-cookie"];
    const access = verifyCookies.find((c) => c.startsWith("accessToken="));
    const refresh = verifyCookies.find((c) => c.startsWith("refreshToken="));
    expect(access).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/HttpOnly/i);
    // Persistent cookies (the session-cookie bug fix): must carry Max-Age/Expires.
    expect(access).toMatch(/Max-Age|Expires/i);
    expect(verify.body.data.user).toBeDefined();
    expect(verify.body.data.user).not.toHaveProperty("password");
    expect(verify.body.data.user).not.toHaveProperty("refreshToken");

    // ── 5. Authenticated calls now succeed with the jar's cookies ─────────
    const admins = await agent.get(`${BASE}/admins`);
    expect(admins.status).toBe(200);

    // The endpoint from the original bug report — proves it's reachable once a
    // real session cookie exists.
    const bookings = await agent.get("/api/v1/pooja/bookings");
    expect(bookings.status).toBe(200);
    expect(Array.isArray(bookings.body.data.bookings)).toBe(true);

    // ── 6. A cookie-less client is rejected ───────────────────────────────
    const anon = await request(app).get(`${BASE}/admins`);
    expect(anon.status).toBe(401);

    // ── 7. Refresh reissues persistent session cookies; session stays alive ─
    const refreshed = await agent.post(`${BASE}/refresh_token`);
    expect(refreshed.status).toBe(200);
    const refreshCookies = refreshed.headers["set-cookie"];
    const rotatedRefresh = readCookie(refreshCookies, "refreshToken");
    expect(rotatedRefresh).toBeDefined();
    expect(refreshCookies.find((c) => c.startsWith("accessToken="))).toMatch(
      /Max-Age|Expires/i,
    );
    // Session still works after a legitimate refresh.
    expect((await agent.get(`${BASE}/admins`)).status).toBe(200);

    // ── 8. Logout clears the session AND invalidates the refresh token ────
    const logout = await agent.post(`${BASE}/logout`);
    expect(logout.status).toBe(200);
    // Access cookie is gone → authed calls fail.
    expect((await agent.get(`${BASE}/admins`)).status).toBe(401);
    // The refresh token from before logout can no longer mint a new session
    // (logout wipes the stored token), so a stolen/stale refresh is useless.
    const refreshAfterLogout = await request(app)
      .post(`${BASE}/refresh_token`)
      .set("Cookie", `refreshToken=${rotatedRefresh}`);
    expect(refreshAfterLogout.status).toBe(401);

    // ── 9. Trusted device (deviceId cookie survived logout) logs in directly,
    //       skipping OTP.
    const reLogin = await agent
      .post(`${BASE}/login`)
      .send({ email: user.email, password: DEFAULT_PASSWORD });
    expect(reLogin.status).toBe(200);
    expect(reLogin.body.data.requiresOtp).toBeFalsy();
    expect(reLogin.body.data.user).toBeDefined();
    // Straight to a working session, no OTP round-trip.
    expect((await agent.get(`${BASE}/admins`)).status).toBe(200);
  });
});
