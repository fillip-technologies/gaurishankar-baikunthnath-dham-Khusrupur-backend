import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { Prasad } from "../models/prasad.model.js";
import {
  addPrasadService,
  updatePrasadService,
  deletePrasadService,
} from "../services/prasad.service.js";

export const addPrasad = asyncHandler(async (req, res) => {
  const { prasadName, pricePerKg, description } = req.validated.body;
  const file = req.file;
  const response = await addPrasadService({
    prasadName,
    pricePerKg,
    description,
    file,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Prasad added!"));
});

export const updatePrasad = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required field");

  const { prasadName, pricePerKg, description } = req.validated.body;
  const file = req.file;

  if (
    prasadName === undefined &&
    pricePerKg === undefined &&
    description === undefined &&
    !file
  )
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "At least one field is required to update",
    );

  const response = await updatePrasadService({
    id,
    prasadName,
    pricePerKg,
    description,
    file,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Prasad updated!"));
});

export const removePrasad = asyncHandler(async (req, res) => {
  const id = req.params?.id;

  const response = await deletePrasadService({ id });
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Deleted succesfully"));
});

export const getAllPrasad = asyncHandler(async (req, res) => {
  const prasad = await Prasad.find().lean();

  if (prasad.length <= 0)
    return res
      .status(HTTP_STATUS.NO_CONTENT)
      .json(
        new ApiResponse(HTTP_STATUS.NO_CONTENT, null, "No prasad is listed"),
      );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, prasad, "All prasad"));
});
