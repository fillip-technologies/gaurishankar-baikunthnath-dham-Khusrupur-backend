import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import MediaCoverage from "../models/mediaCoverage.model.js";
import {
  createMediaService,
  deleteMediaService,
  updateMediaService,
} from "../services/mediaCoverageService.services.js";

export const createMedia = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No file uploaded");

  const response = await createMediaService({
    fields: { ...req.validated.body, userId: req.user._id },
    file,
  });

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, response, "Media created successfully"),
    );
});

export const updateMedia = asyncHandler(async (req, res) => {
  const mediaId = req.params?.id;
  if (!mediaId)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No media id provided");

  const response = await updateMediaService({
    mediaId,
    fields: req.validated.body,
    file: req.file,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Media updated successfully"),
    );
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const mediaId = req.query?.id;
  if (!mediaId)
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "No media is found with this id",
    );
  const response = await deleteMediaService({ mediaId });
  if (!response)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Something went wrong",
    );

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Data deleted Succesfully"),
    );
});

export const getMedia = asyncHandler(async (req, res) => {
  const mediaId = req.params?.id;

  if (!mediaId)
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "No media is found with this id",
    );
  const response = await MediaCoverage.findById(mediaId).lean();
  if (!response) throw new ApiError(HTTP_STATUS.NOT_FOUND, "No media is found");
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Media fetched succesfully"),
    );
});

export const getAllMedia = asyncHandler(async (req, res) => {
  const allMedia = await MediaCoverage.find().sort({ createdAt: -1 }).lean();
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        allMedia,
        allMedia.length
          ? "All media fetched succesfully"
          : "No media is found",
      ),
    );
});
