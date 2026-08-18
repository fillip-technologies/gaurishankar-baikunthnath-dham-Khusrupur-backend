import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock Cloudinary so uploads/deletes don't hit the network. Must be declared
// before the app (and therefore the prasad service) is imported.
vi.mock("../../src/utils/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    secure_url: "https://cdn.test/prasad/img.png",
    public_id: "prasad/img",
    resource_type: "image",
  }),
  deleteFromCloudinary: vi.fn().mockResolvedValue({ result: "ok" }),
}));

import app from "../../src/app.js";
import { deleteFromCloudinary } from "../../src/utils/cloudinary.js";
import { Prasad } from "../../src/services/bookings/models/prasad.model.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const ADD_URL = "/api/v1/prasad/add";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic bytes

describe("POST /api/v1/prasad/add", () => {
  it("uploads a file and creates a prasad record (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("prasadName", "Laddu")
      .field("priceperkg", "250")
      .field("description", "Sweet besan laddu")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(200);
    expect(res.body.data.prasadName).toBe("Laddu");
    // priceperkg arrives as a string in multipart form-data; z.coerce.number()
    // must have converted it to a number.
    expect(res.body.data.priceperkg).toBe(250);
    expect(res.body.data.imageUrl).toBe("https://cdn.test/prasad/img.png");
    expect(res.body.data.publicId).toBe("prasad/img");
  });

  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app)
      .post(ADD_URL)
      .field("prasadName", "Laddu")
      .field("priceperkg", "250")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("prasadName", "Laddu")
      .field("priceperkg", "250");

    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-positive price", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("prasadName", "Laddu")
      .field("priceperkg", "-5")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate prasadName (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const send = () =>
      request(app)
        .post(ADD_URL)
        .set("Cookie", cookie)
        .field("prasadName", "Peda")
        .field("priceperkg", "300")
        .attach("file", PNG, "img.png");

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(409);
  });
});

describe("DELETE /api/v1/prasad/remove/:id", () => {
  it("deletes the record and its Cloudinary asset (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const prasad = await Prasad.create({
      prasadName: "Barfi",
      imageUrl: "https://cdn.test/prasad/barfi.png",
      publicId: "prasad/barfi",
      priceperkg: 400,
    });

    const res = await request(app)
      .delete(`/api/v1/prasad/remove/${prasad._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    // The stored publicId must be forwarded to Cloudinary for cleanup.
    expect(deleteFromCloudinary).toHaveBeenCalledWith("prasad/barfi");
    expect(await Prasad.findById(prasad._id)).toBeNull();
  });

  it("returns 404 for a missing id", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .delete("/api/v1/prasad/remove/64b7f0c2f1a2c3d4e5f60718")
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });
});
