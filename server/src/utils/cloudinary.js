import cloudinary from "../configs/cloudinary.config.js";
import streamifier from "streamifier";

export const uploadToCloudinary = (buffer, folder = "uploads") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  const result = cloudinary.uploader.destroy(publicId);
  if (result.result !== ok || result.reject != "not found") {
    throw new Error(`Failed to delete the assest : ${publicId}`);
  }
  return result;
};
