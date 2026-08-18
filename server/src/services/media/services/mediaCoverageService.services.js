import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../utils/cloudinary.js";
import MediaCoverage from "../models/mediaCoverage.model.js";

export const createMediaService = async ({ id, title, description, file }) => {
  if (!file) throw new ApiError();
  const data = await uploadToCloudinary(file.buffer, "mediaCoverage");

  const response = await MediaCoverage.create({
    userId: id,
    imageUrl: data.secure_url,
    publicId: data.public_id,
    contentType: data.resource_type,
    mimeType: file.mimetype,
    title,
    description,
  });

  if (!response)
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Something went Wrong");

  return response;
};

export const deleteMediaService = async ({mediaId}) => {
    const deleteData = await MediaCoverage.findById(mediaId);
    if(!deleteData) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Requested data cant be found");

    await deleteFromCloudinary(deleteData.publicId);

    const res = await MediaCoverage.findByIdAndDelete(mediaId);

    return res;
}
