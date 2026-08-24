import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const BASE = "/api/v1/addresses";

describe("PATCH /", () => {
  it("creates the address on first update", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .patch(`${BASE}`)
      .set("Cookie", cookie)
      .send({ state: "Bihar" });

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe("Bihar");
    expect(res.body.data.userId).toBe(admin._id.toString());
  });

  it("a later field update preserves previously saved fields (no clobber, no duplicate)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    await request(app)
      .patch(`${BASE}`)
      .set("Cookie", cookie)
      .send({ state: "Bihar" });

    const res = await request(app)
      .patch(`${BASE}`)
      .set("Cookie", cookie)
      .send({ zipcode: "801301" });

    expect(res.status).toBe(200);
    // The new field is set...
    expect(res.body.data.zipcode).toBe("801301");
    // ...and the earlier field is untouched.
    expect(res.body.data.state).toBe("Bihar");
  });

  it("accepts an empty body (all fields optional)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .patch(`${BASE}`)
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(200);
  });

  it("returns 400 for an invalid zipcode", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .patch(`${BASE}`)
      .set("Cookie", cookie)
      .send({ zipcode: "123" });
    expect(res.status).toBe(400);
  });

  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app).patch(`${BASE}`).send({ state: "Bihar" });
    expect(res.status).toBe(401);
  });
});
