import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Admin } from "../../src/services/auth/models/user.model.js";
import {
  makeAdmin,
  makeSuperadmin,
  authCookieFor,
  DEFAULT_PASSWORD,
} from "../helpers/factories.js";

const BASE = "/api/v1/auth";

describe("admin management routes", () => {
  describe("POST /create_admin", () => {
    it("lets a superadmin create an admin (201)", async () => {
      const superAdmin = await makeSuperadmin();
      const cookie = await authCookieFor(superAdmin);
      const res = await request(app)
        .post(`${BASE}/create_admin`)
        .set("Cookie", cookie)
        .send({
          fullname: "Created Admin",
          mobile_number: "9990001110",
          email: "created@test.com",
          password: "secret123",
        });
      expect(res.status).toBe(201);
      expect(await Admin.findOne({ email: "created@test.com" })).not.toBeNull();
    });

    it("forbids a non-superadmin (403)", async () => {
      const admin = await makeAdmin();
      const cookie = await authCookieFor(admin);
      const res = await request(app)
        .post(`${BASE}/create_admin`)
        .set("Cookie", cookie)
        .send({
          fullname: "Nope",
          mobile_number: "9990001110",
          email: "nope@test.com",
          password: "secret123",
        });
      expect(res.status).toBe(403);
    });

    it("rejects an unauthenticated request (401)", async () => {
      const res = await request(app).post(`${BASE}/create_admin`).send({
        fullname: "Nope",
        mobile_number: "9990001110",
        email: "nope@test.com",
        password: "secret123",
      });
      expect(res.status).toBe(401);
    });

    it("returns 409 for a duplicate email", async () => {
      const superAdmin = await makeSuperadmin();
      const cookie = await authCookieFor(superAdmin);
      await makeAdmin({ email: "dupe@test.com" });
      const res = await request(app)
        .post(`${BASE}/create_admin`)
        .set("Cookie", cookie)
        .send({
          fullname: "Dupe",
          mobile_number: "9990001110",
          email: "dupe@test.com",
          password: "secret123",
        });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /admins & /profile", () => {
    it("lists admins for a superadmin and never leaks passwords", async () => {
      const superAdmin = await makeSuperadmin();
      await makeAdmin();
      const cookie = await authCookieFor(superAdmin);
      const res = await request(app).get(`${BASE}/admins`).set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const a of res.body.data) expect(a).not.toHaveProperty("password");
    });

    it("returns an admin's profile without sensitive fields", async () => {
      const admin = await makeAdmin();
      const cookie = await authCookieFor(admin);
      const res = await request(app)
        .get(`${BASE}/profile/${admin._id}`)
        .set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("refreshToken");
    });

    it("returns 400 for a malformed admin id", async () => {
      const superAdmin = await makeSuperadmin();
      const cookie = await authCookieFor(superAdmin);
      const res = await request(app)
        .get(`${BASE}/profile/not-a-valid-object-id`)
        .set("Cookie", cookie);
      expect(res.status).toBe(400);
    });

    it("rejects a token whose session has been revoked (401)", async () => {
      const admin = await makeAdmin();
      const cookie = await authCookieFor(admin); // token bound to current sessionId
      // Rotate the session server-side → old token is now stale.
      await Admin.updateOne({ _id: admin._id }, { $set: { sessionId: "rotated" } });
      const res = await request(app)
        .get(`${BASE}/profile/${admin._id}`)
        .set("Cookie", cookie);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /remove_admin", () => {
    it("removes a target admin with the correct superadmin password", async () => {
      const superAdmin = await makeSuperadmin();
      const cookie = await authCookieFor(superAdmin);
      const target = await makeAdmin({ email: "target@test.com" });
      const res = await request(app)
        .delete(`${BASE}/remove_admin`)
        .set("Cookie", cookie)
        .send({ adminEmail: "target@test.com", superAdminPassword: DEFAULT_PASSWORD });
      expect(res.status).toBe(200);
      expect(await Admin.findById(target._id)).toBeNull();
    });

    it("rejects a wrong superadmin password (401)", async () => {
      const superAdmin = await makeSuperadmin();
      const cookie = await authCookieFor(superAdmin);
      await makeAdmin({ email: "target2@test.com" });
      const res = await request(app)
        .delete(`${BASE}/remove_admin`)
        .set("Cookie", cookie)
        .send({ adminEmail: "target2@test.com", superAdminPassword: "wrongpass" });
      expect(res.status).toBe(401);
    });
  });
});
