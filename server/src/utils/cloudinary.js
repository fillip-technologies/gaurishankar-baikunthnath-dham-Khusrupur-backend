import cloudinary from "../configs/cloudinary.config.js";
import streamifier from "streamifier";

// ~90 MB. Cloudinary's single-request upload_stream caps around 100 MB; files
// larger than this must be uploaded in chunks via upload_chunked_stream.
const LARGE_UPLOAD_THRESHOLD = 90 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per chunk (min allowed is 5 MB)

export const uploadToCloudinary = (buffer, folder = "uploads") => {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: "auto" };
    const cb = (error, result) => (error ? reject(error) : resolve(result));

    const stream =
      buffer.length > LARGE_UPLOAD_THRESHOLD
        ? cloudinary.uploader.upload_chunked_stream(
            { ...options, chunk_size: UPLOAD_CHUNK_SIZE },
            cb,
          )
        : cloudinary.uploader.upload_stream(options, cb);

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  const result = await cloudinary.uploader.destroy(publicId);
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Failed to delete the asset : ${publicId}`);
  }
  return result;
};

// Uploads several multer files to a folder and returns the stored image shape
// ({ url, publicId }) for each file.
export const uploadImagesToCloudinary = async (files = [], folder) => {
  if (!files.length) return [];
  const results = await Promise.all(
    files.map((file) => uploadToCloudinary(file.buffer, folder)),
  );
  return results.map((result) => ({
    url: result.secure_url,
    publicId: result.public_id,
  }));
};

// Best-effort cleanup of an array of stored images.
export const deleteImagesFromCloudinary = async (images = []) => {
  await Promise.all(images.map((image) => deleteFromCloudinary(image.publicId)));
};

// Builds an on-the-fly optimized delivery URL for an image asset.
// f_auto -> serves WebP/AVIF where supported, q_auto -> smart compression,
// w/c_limit -> never upscales, only caps the delivered width.
export const buildImageDeliveryUrl = (publicId, width) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    transformation: [
      { width, crop: "limit" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });
};

// Builds a playable video delivery URL transcoded to a target height (e.g. 480,
// 720, 1080) as mp4 with automatic quality. Used to offer resolution options in
// the player. `c_limit` never upscales beyond the source resolution.
export const buildVideoUrl = (publicId, height) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "video",
    format: "mp4",
    transformation: [
      { height, crop: "limit" },
      { quality: "auto" },
    ],
  });
};

// Builds a still-frame poster (jpg) from a video asset, optimized and resized.
// Used so the gallery grid shows a lightweight thumbnail instead of pulling the
// whole video just to render a preview.
export const buildVideoPosterUrl = (publicId, width) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "video",
    format: "jpg",
    transformation: [
      { width, crop: "limit" },
      { quality: "auto" },
    ],
  });
};
