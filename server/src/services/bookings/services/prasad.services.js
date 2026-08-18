import { HTTP_STATUS } from "../../../constants/httpStatus.constants";
import ApiError from "../../../utils/ApiError";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../utils/cloudinary";
import { Prasad } from "../models/prasad.model";

export const addPrasadService = async ({
  prasadName,
  priceperkg,
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
    priceperkg,
    description,
  });

  if (!response)
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Something went wrong");

  return response;
};

export const deletePrasadService = async ({ id }) => {
  const prasad = await Prasad.findById(id);
  if (!prasad) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Prasad not found");
  await deleteFromCloudinary(prasad.publicId);
  const deleted = await Prasad.findByIdAndDelete(id);

  if(!deleted) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Something went wrong");
  return deleted;
};
