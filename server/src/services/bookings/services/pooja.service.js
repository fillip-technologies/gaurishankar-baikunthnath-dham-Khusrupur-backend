import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Pooja } from "../models/pooja.model.js";

export const addPoojaService = async ({
  poojaName,
  description,
  price,
  file,
}) => {
  if (!file?.buffer)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Pooja image is required");

  const existing = await Pooja.findOne({ poojaName }).lean();
  if (existing)
    throw new ApiError(HTTP_STATUS.CONFLICT, "Pooja already exists");

  const upload = await uploadToCloudinary(file.buffer);
  if (!upload)
    throw new ApiError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      "Something went wrong",
    );

  const pooja = await Pooja.create({
    poojaName,
    description,
    imageUrl: upload.secure_url,
    publicId: upload.public_id,
    price,
  });

  if (!pooja)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem creating pooja!!",
    );

  return pooja;
};

export const removePoojaService = async ({ id }) => {
  const requestedData = await Pooja.findById(id);
  if (!requestedData)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Data not found");

  await deleteFromCloudinary(requestedData.publicId);

  const data = await Pooja.findByIdAndDelete(id);

  if (!data) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Something went wrong");

  return data;
};

export const updatePoojaService = async ({
  id,
  poojaName,
  description,
  price,
  file,
}) => {
  const pooja = await Pooja.findById(id);
  if (!pooja) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Pooja not found");

  if (poojaName !== undefined && poojaName !== pooja.poojaName) {
    const duplicate = await Pooja.findOne({
      poojaName,
      _id: { $ne: id },
    }).lean();
    if (duplicate)
      throw new ApiError(HTTP_STATUS.CONFLICT, "Pooja already exists");
  }

  if (poojaName !== undefined) pooja.poojaName = poojaName;
  if (description !== undefined) pooja.description = description;
  if (price !== undefined) pooja.price = price;

  // Replace the image only after a successful upload, then clean up the old
  // asset once the document is saved so a failed upload never orphans the record.
  const oldPublicId = pooja.publicId;
  let uploadedNewImage = false;
  if (file?.buffer) {
    const upload = await uploadToCloudinary(file.buffer);
    if (!upload)
      throw new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Something went wrong",
      );
    pooja.imageUrl = upload.secure_url;
    pooja.publicId = upload.public_id;
    uploadedNewImage = true;
  }

  const updated = await pooja.save();

  if (uploadedNewImage && oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return updated;
};
