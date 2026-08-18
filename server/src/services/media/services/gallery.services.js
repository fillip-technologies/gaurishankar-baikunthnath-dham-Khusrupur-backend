import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import Gallery from "../models/gallery.model.js";

export const uploadToGalleryService = async ({
  user,
  title,
  dataType,
  file,
}) => {
  const uploadFile = await uploadToCloudinary(file.buffer, "gallery");

  const gallery = await Gallery.create({
    userId: user._id,
    imageUrl: uploadFile.secure_url,
    publicId: uploadFile.public_id,
    contentType: uploadFile.resource_type,
    mimeType: file.mimetype,
    dataType,
    title,
  });

  if (!gallery)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to upload to gallery",
    );

  return gallery;
};

export const deleteGalleryDataService = async ({ id }) => {
  const data = await Gallery.findById(id);

  if (!data) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Gallery data not found");
  }

  const deletedFromCloudinary = await deleteFromCloudinary(data.publicId);

  if (!deletedFromCloudinary) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete media",
    );
  }

  await Gallery.findByIdAndDelete(id);

  return {
    message: "Gallery data deleted successfully",
  };
};

export const getGalleryDataService = async ({ dataType, limit, skip }) => {
  const response = await Gallery.find({ dataType: dataType })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (response.length < 0)
    throw new ApiError(HTTP_STATUS.NO_CONTENT, "No Content");

  return response;
};
