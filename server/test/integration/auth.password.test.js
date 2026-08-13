import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Admin } from "../../src/services/auth/models/user.model.js";
import { makeAdmin, authCookieFor, DEFAULT_PASSWORD } from "../helpers/factories.js";

const BASE = "/api/v1/auth";

describe("PATCH /update_password", () => {
  it("updates the password with the correct current password", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .patch(`${BASE}/update_password`)
      .set("Cookie", cookie)
      .send({ current_password: DEFAULT_PASSWORD, newpassword: "brandnew1" });

    expect(res.status).toBe(200);
    const fresh = await Admin.findById(admin._id).select("+password");
    expect(await fresh.comparePassword("brandnew1")).toBe(true);
  });

  it("rejects a wrong current password (401)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .patch(`${BASE}/update_password`)
      .set("Cookie", cookie)
      .send({ current_password: "wrongpass", newpassword: "brandnew1" });
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app)
      .patch(`${BASE}/update_password`)
      .send({ current_password: DEFAULT_PASSWORD, newpassword: "brandnew1" });
    expect(res.status).toBe(401);
  });
});
