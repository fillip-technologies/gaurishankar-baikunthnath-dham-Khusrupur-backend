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
import { PoojaCategory } from "../../src/services/bookings/models/poojaCategory.model.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const ADD_URL = "/api/v1/pooja/add";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic bytes

let catSeq = 0;
const seedCategory = (name) =>
  PoojaCategory.create({ name: name || `Category ${catSeq++}` });

describe("POST /api/v1/pooja/add", () => {
  it("uploads a file and creates a pooja record under a category (201)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const category = await seedCategory("Abhishek");

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .field("description", "Special abhishek pooja")
      .field("category", category._id.toString())
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(201);
    expect(res.body.data.poojaName).toBe("Rudrabhishek");
    // price arrives as a string in multipart form-data; z.coerce.number()
    // must have converted it to a number.
    expect(res.body.data.price).toBe(1100);
    expect(res.body.data.category).toBe(category._id.toString());
    expect(res.body.data.imageUrl).toBe("https://cdn.test/pooja/img.png");
    expect(res.body.data.publicId).toBe("pooja/img");
  });

  it("creates the category on the fly from categoryName (201)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Havan Pooja")
      .field("price", "900")
      .field("categoryName", "Havan / Yagna")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(201);
    // A brand-new category was created and linked.
    const category = await PoojaCategory.findOne({ name: "Havan / Yagna" });
    expect(category).not.toBeNull();
    expect(res.body.data.category).toBe(category._id.toString());
  });

  it("returns 400 when category is missing", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent category", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .field("category", "64b7f0c2f1a2c3d4e5f60718")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(404);
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
    const category = await seedCategory();

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "1100")
      .field("category", category._id.toString());

    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-positive price", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const category = await seedCategory();

    const res = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Rudrabhishek")
      .field("price", "-5")
      .field("category", category._id.toString())
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate poojaName (409)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const category = await seedCategory();

    const send = () =>
      request(app)
        .post(ADD_URL)
        .set("Cookie", cookie)
        .field("poojaName", "Satyanarayan Katha")
        .field("price", "2100")
        .field("category", category._id.toString())
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

  // The discriminating test the category design hinges on: a pooja created
  // BEFORE categories existed has no `category`. Editing just its price must
  // still save — proving `category` is not `required` at the model level (which
  // would make full-document validation on `.save()` reject the legacy doc).
  it("edits a category-less (legacy) pooja without forcing a category (200)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const pooja = await Pooja.create({
      poojaName: "Legacy Pooja",
      imageUrl: "https://cdn.test/pooja/legacy.png",
      publicId: "pooja/legacy",
      price: 400,
    });

    const res = await request(app)
      .patch(`/api/v1/pooja/update/${pooja._id}`)
      .set("Cookie", cookie)
      .field("price", "650");

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(650);
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

  it("lists all poojas with the category populated (200)", async () => {
    const category = await seedCategory("Aarti");
    await Pooja.create({
      poojaName: "Mangla Aarti",
      imageUrl: "https://cdn.test/pooja/mangla.png",
      publicId: "pooja/mangla",
      price: 251,
      category: category._id,
    });

    const res = await request(app).get("/api/v1/pooja/poojas");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].poojaName).toBe("Mangla Aarti");
    // `category` is populated to a { _id, name } sub-document.
    expect(res.body.data[0].category.name).toBe("Aarti");
  });
});

describe("Pooja categories", () => {
  const CAT_URL = "/api/v1/pooja/categories";

  it("lists only in-use categories publicly (200)", async () => {
    // An in-use category (has a pooja) is listed…
    const used = await seedCategory("Vehicle Pooja");
    await Pooja.create({
      poojaName: "Two-Wheeler Pooja",
      imageUrl: "https://cdn.test/pooja/tw.png",
      publicId: "pooja/tw",
      price: 100,
      category: used._id,
    });
    // …while an empty category is NOT (no poojas reference it).
    await seedCategory("Empty Category");

    const res = await request(app).get(CAT_URL);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Vehicle Pooja");
  });

  it("has no create endpoint — categories are born with poojas (404)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const res = await request(app)
      .post(CAT_URL)
      .set("Cookie", cookie)
      .send({ name: "Manual" });
    expect(res.status).toBe(404);
  });

  it("auto-deletes a category when its last pooja is removed", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    // Add a pooja that spawns a fresh category…
    const add = await request(app)
      .post(ADD_URL)
      .set("Cookie", cookie)
      .field("poojaName", "Only Pooja")
      .field("price", "500")
      .field("categoryName", "Lonely Category")
      .attach("file", PNG, "img.png");
    expect(add.status).toBe(201);
    const category = await PoojaCategory.findOne({ name: "Lonely Category" });
    expect(category).not.toBeNull();

    // …then delete it: the now-empty category should vanish too.
    const del = await request(app)
      .delete(`/api/v1/pooja/remove/${add.body.data._id}`)
      .set("Cookie", cookie);
    expect(del.status).toBe(200);
    expect(await PoojaCategory.findById(category._id)).toBeNull();
  });

  it("keeps a category alive while other poojas still use it", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const category = await seedCategory("Shared");

    const first = await Pooja.create({
      poojaName: "First",
      imageUrl: "https://cdn.test/pooja/1.png",
      publicId: "pooja/1",
      price: 100,
      category: category._id,
    });
    await Pooja.create({
      poojaName: "Second",
      imageUrl: "https://cdn.test/pooja/2.png",
      publicId: "pooja/2",
      price: 100,
      category: category._id,
    });

    const del = await request(app)
      .delete(`/api/v1/pooja/remove/${first._id}`)
      .set("Cookie", cookie);
    expect(del.status).toBe(200);
    // "Second" still references it, so the category survives.
    expect(await PoojaCategory.findById(category._id)).not.toBeNull();
  });

  it("retires the old category when a pooja is moved off it", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);
    const oldCat = await seedCategory("Old Home");
    const newCat = await seedCategory("New Home");

    const pooja = await Pooja.create({
      poojaName: "Mover",
      imageUrl: "https://cdn.test/pooja/mover.png",
      publicId: "pooja/mover",
      price: 100,
      category: oldCat._id,
    });

    const res = await request(app)
      .patch(`/api/v1/pooja/update/${pooja._id}`)
      .set("Cookie", cookie)
      .field("category", newCat._id.toString());
    expect(res.status).toBe(200);

    // Old category emptied out → gone; new one holds the pooja.
    expect(await PoojaCategory.findById(oldCat._id)).toBeNull();
    expect(await PoojaCategory.findById(newCat._id)).not.toBeNull();
  });
});
