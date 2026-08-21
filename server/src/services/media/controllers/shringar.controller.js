import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadImagesToCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Shringar } from "../models/shringar.model.js";

export const addShringar = asyncHandler(async (req, res) => {
  const file = req.file;
  const { title } = req.body;
  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Add a image to add!");
  if (title && title.length <= 2)
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Title must be atleast 3 character long",
    );

  const upload = await uploadToCloudinary(file.buffer);
  if (!upload)
    throw new ApiError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      "Something went wrong",
    );

  const shringar = await Shringar.create({
    title: title,
    imageUrl: upload.secure_url,
    publicId: upload.public_id,
  });

  if (!shringar)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Something went wrong");
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, shringar, "Shringar updated succesfully"),
    );
});

export const deleteShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  const shringar = await Shringar.findById(id);
  
  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "request data not found");
  await deleteFromCloudinary(shringar.publicId);

  const deleted = await Shringar.findByIdAndDelete(id);

  if (!deleted)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem deleting data",
    );

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, deleted, "Data deleted succesfully"));
});

export const getAllShringar = asyncHandler(async (req, res) => {
  const shringar = await Shringar.find().sort({ createdAt: -1 });

  if (shringar.length <= 0)
    return res
      .status(HTTP_STATUS.NO_CONTENT)
      .json(
        new ApiResponse(HTTP_STATUS.NO_CONTENT, null, "No shringar is found"),
      );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, shringar, "All shringar are found"));
});

export const getShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id needs to be passed");

  const shringar = await Shringar.findById(id).lean();
  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Request data can not be found");
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, shringar, "OK"));
});
