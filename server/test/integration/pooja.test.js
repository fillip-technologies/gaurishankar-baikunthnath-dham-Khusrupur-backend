import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock Cloudinary so uploads/deletes don't hit the network. Must be declared
// before the app (and therefore the pooja service) is imported.
vi.mock("../../src/utils/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    secure_url: "https://cdn.test/pooja/img.png",
    public_id: "pooja/img",
    resource_type: "image",
  }),
  deleteFromCloudinary: vi.fn().mockResolvedValue({ result: "ok" }),
}));

import app from "../../src/app.js";
import { deleteFromCloudinary } from "../../src/utils/cloudinary.js";
import { Pooja } from "../../src/services/bookings/models/pooja.model.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const ADD_URL = "/api/v1/pooja/add";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic bytes

describe("POST /api/v1/pooja/add", () => {
  it("uploads a file and creates a pooja record (201)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .field("description", "Special abhishek pooja")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(201);
    expect(res.body.data.poojaName).toBe("Rudrabhishek");
    // price arrives as a string in multipart form-data; z.coerce.number()
    // must have converted it to a number.
    expect(res.body.data.price).toBe(1100);
    expect(res.body.data.imageUrl).toBe("https://cdn.test/pooja/img.png");
    expect(res.body.data.publicId).toBe("pooja/img");
  });

  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app)
      .post(ADD_URL)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100");

    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-positive price", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "-5")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate poojaName (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const send = () =>
      request(app)
        .post(ADD_URL)
        .set("Cookie", cookie)
        .field("poojaName", "Satyanarayan Katha")
        .field("price", "2100")
        .attach("file", PNG, "img.png");

    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(409);
  });
});

describe("PATCH /api/v1/pooja/update/:id", () => {
  it("updates fields on an existing pooja (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const pooja = await Pooja.create({
      poojaName: "Ganesh Pooja",
      imageUrl: "https://cdn.test/pooja/ganesh.png",
      publicId: "pooja/ganesh",
      price: 500,
    });

    const res = await request(app)
      .patch(`/api/v1/pooja/update/${pooja._id}`)
      .set("Cookie", cookie)
      .field("price", "750");

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(750);
    expect(res.body.data.poojaName).toBe("Ganesh Pooja");
  });

  it("returns 400 when no field and no file are provided", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const pooja = await Pooja.create({
      poojaName: "Lakshmi Pooja",
      imageUrl: "https://cdn.test/pooja/lakshmi.png",
      publicId: "pooja/lakshmi",
      price: 900,
    });

    const res = await request(app)
      .patch(`/api/v1/pooja/update/${pooja._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .patch("/api/v1/pooja/update/64b7f0c2f1a2c3d4e5f60718")
      .set("Cookie", cookie)
      .field("price", "750");

    expect(res.status).toBe(404);
  });

  it("rejects an unauthenticated request (401)", async () => {
    const pooja = await Pooja.create({
      poojaName: "Navagraha Pooja",
      imageUrl: "https://cdn.test/pooja/navagraha.png",
      publicId: "pooja/navagraha",
      price: 1500,
    });

    const res = await request(app)
      .patch(`/api/v1/pooja/update/${pooja._id}`)
      .field("price", "750");

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/v1/pooja/remove/:id", () => {
  it("deletes the record and its Cloudinary asset (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const pooja = await Pooja.create({
      poojaName: "Hawan",
      imageUrl: "https://cdn.test/pooja/hawan.png",
      publicId: "pooja/hawan",
      price: 3100,
    });

    const res = await request(app)
      .delete(`/api/v1/pooja/remove/${pooja._id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    // The stored publicId must be forwarded to Cloudinary for cleanup.
    expect(deleteFromCloudinary).toHaveBeenCalledWith("pooja/hawan");
    expect(await Pooja.findById(pooja._id)).toBeNull();
  });

  it("returns 404 for a missing id", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .delete("/api/v1/pooja/remove/64b7f0c2f1a2c3d4e5f60718")
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });

  it("rejects an unauthenticated request (401)", async () => {
    const pooja = await Pooja.create({
      poojaName: "Griha Pravesh",
      imageUrl: "https://cdn.test/pooja/griha.png",
      publicId: "pooja/griha",
      price: 5100,
    });

    const res = await request(app).delete(
      `/api/v1/pooja/remove/${pooja._id}`,
    );

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/pooja/poojas", () => {
  it("returns 200 with an empty array when no pooja is listed", async () => {
    const res = await request(app).get("/api/v1/pooja/poojas");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("lists all poojas (200)", async () => {
    await Pooja.create({
      poojaName: "Mangla Aarti",
      imageUrl: "https://cdn.test/pooja/mangla.png",
      publicId: "pooja/mangla",
      price: 251,
    });

    const res = await request(app).get("/api/v1/pooja/poojas");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].poojaName).toBe("Mangla Aarti");
  });
});
