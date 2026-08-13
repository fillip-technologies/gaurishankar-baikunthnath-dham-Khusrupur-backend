import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { makeAdmin, DEFAULT_PASSWORD } from "../helpers/factories.js";

const BASE = "/api/v1/auth";

describe("security hardening", () => {
  // The ONLY /login usage in this file — keeps the per-file limiter store clean.
  it("rate-limits repeated login attempts (429)", async () => {
    const user = await makeAdmin();
    const max = Number(process.env.RATE_LIMIT_LOGIN_MAX);

    let last;
    for (let i = 0; i <= max; i++) {
      last = await request(app)
        .post(`${BASE}/login`)
        .send({ email: user.email, password: "wrongpass" });
    }
    expect(last.status).toBe(429);
    expect(last.body.message).toMatch(/too many/i);
  });

  it("rejects protected routes without authentication (401)", async () => {
    const res = await request(app).get(`${BASE}/admins`);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await request(app)
      .post(`${BASE}/create_admin`)
      .set("Content-Type", "application/json")
      .send('{"fullname": "x",}'); // trailing comma → invalid JSON
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown route", async () => {
    const res = await request(app).get(`${BASE}/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Route not found");
  });

  it("rejects an oversized request body (413)", async () => {
    const huge = "a".repeat(11 * 1024); // > 10kb limit
    const res = await request(app)
      .post(`${BASE}/create_admin`)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ blob: huge }));
    expect(res.status).toBe(413);
  });
});
