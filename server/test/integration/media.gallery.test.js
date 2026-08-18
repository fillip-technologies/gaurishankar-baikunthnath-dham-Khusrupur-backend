import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock Cloudinary so uploads don't hit the network. Must be declared before the
// app (and therefore the gallery service) is imported.
vi.mock("../../src/utils/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    secure_url: "https://cdn.test/gallery/img.png",
    public_id: "gallery/img",
    resource_type: "image",
  }),
  deleteFromCloudinary: vi.fn().mockResolvedValue({ result: "ok" }),
}));

import app from "../../src/app.js";
import { uploadToCloudinary } from "../../src/utils/cloudinary.js";
import { makeAdmin, authCookieFor } from "../helpers/factories.js";

const URL = "/api/v1/media/galleryUpload";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic bytes

describe("POST /api/v1/media/galleryUpload", () => {
  it("uploads a file and creates a gallery record (201)", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(URL)
      .set("Cookie", cookie)
      .field("title", "Temple Front")
      .field("dataType", "photos")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(201);
    expect(res.body.data.imageUrl).toBe("https://cdn.test/gallery/img.png");
    expect(res.body.data.dataType).toBe("photos");
    expect(res.body.data.title).toBe("Temple Front");
    expect(res.body.data.userId).toBe(admin._id.toString());

    // Verify our buffer handoff: the service forwards the uploaded file's buffer
    // and the correct folder to Cloudinary (SDK itself is mocked).
    expect(uploadToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), "gallery");
    const [bufferArg] = uploadToCloudinary.mock.calls[0];
    expect(bufferArg.equals(PNG)).toBe(true);
  });

  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app)
      .post(URL)
      .field("dataType", "photos")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(URL)
      .set("Cookie", cookie)
      .field("dataType", "photos");

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid dataType", async () => {
    const admin = await makeAdmin();
    const cookie = await authCookieFor(admin);

    const res = await request(app)
      .post(URL)
      .set("Cookie", cookie)
      .field("dataType", "banner")
      .attach("file", PNG, "img.png");

    expect(res.status).toBe(400);
  });
});
