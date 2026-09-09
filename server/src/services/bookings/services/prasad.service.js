import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Prasad } from "../models/prasad.model.js";

export const addPrasadService = async ({
  prasadName,
  pricePerKg,
  description,
  file,
}) => {
  if (!file?.buffer)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Prasad image is required");

  const existing = await Prasad.findOne({ prasadName }).lean();
  if (existing)
    throw new ApiError(HTTP_STATUS.CONFLICT, "Prasad already exists");
  const prasadImage = await uploadToCloudinary(file.buffer);
  if (!prasadImage)
    throw new ApiError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      "Something went wrong",
    );
  const response = await Prasad.create({
    prasadName,
    imageUrl: prasadImage.secure_url,
    publicId: prasadImage.public_id,
    pricePerKg,
    description,
  });

  if (!response)
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Something went wrong");

  return response;
};

export const updatePrasadService = async ({
  id,
  prasadName,
  pricePerKg,
  description,
  file,
}) => {
  const prasad = await Prasad.findById(id);
  if (!prasad) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Prasad not found");

  if (prasadName !== undefined && prasadName !== prasad.prasadName) {
    const duplicate = await Prasad.findOne({
      prasadName,
      _id: { $ne: id },
    }).lean();
    if (duplicate)
      throw new ApiError(HTTP_STATUS.CONFLICT, "Prasad already exists");
  }

  if (prasadName !== undefined) prasad.prasadName = prasadName;
  if (pricePerKg !== undefined) prasad.pricePerKg = pricePerKg;
  if (description !== undefined) prasad.description = description;

  // Replace the image only after a successful upload, then clean up the old
  // asset once the document is saved so a failed upload never orphans the record.
  const oldPublicId = prasad.publicId;
  let uploadedNewImage = false;
  if (file?.buffer) {
    const upload = await uploadToCloudinary(file.buffer);
    if (!upload)
      throw new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Something went wrong",
      );
    prasad.imageUrl = upload.secure_url;
    prasad.publicId = upload.public_id;
    uploadedNewImage = true;
  }

  const updated = await prasad.save();

  if (uploadedNewImage && oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return updated;
};

export const deletePrasadService = async ({ id }) => {
  const prasad = await Prasad.findById(id);
  if (!prasad) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Prasad not found");
  await deleteFromCloudinary(prasad.publicId);
  const deleted = await Prasad.findByIdAndDelete(id);

  if(!deleted) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Something went wrong");
  return deleted;
};
