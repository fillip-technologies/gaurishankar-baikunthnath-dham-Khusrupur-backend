import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import {
  getGalleryDataService,
  uploadToGalleryService,
  deleteGalleryDataService,
} from "../services/gallery.services.js";
import { deleteFromCloudinary } from "../../../utils/cloudinary.js";

export const uploadToGallery = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title, dataType } = req.validated.body;
  const file = req.file;

  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No file uploaded");

  const result = await uploadToGalleryService({
    user,
    title,
    dataType,
    file,
  });

  res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, "Uploaded to gallery"));
});
export const getGalleryData = asyncHandler(async (req, res) => {
  const { page, dataType } = req.validated.query;

  const limit = 20;
  const skip = 20 * (page - 1);
  const response = await getGalleryDataService({ dataType, limit, skip });
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Data fetched succesfully"),
    );
});

export const deleteGalleryData = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await deleteGalleryDataService({ id });
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
});
