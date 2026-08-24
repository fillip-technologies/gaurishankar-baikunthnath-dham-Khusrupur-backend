import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { Pooja } from "../models/pooja.model.js";
import {
  addPoojaService,
  removePoojaService,
  updatePoojaService,
} from "../services/pooja.service.js";

export const addPooja = asyncHandler(async (req, res) => {
  const { poojaName, description, price } = req.validated.body;
  const file = req.file;
  const response = await addPoojaService({
    poojaName,
    description,
    price,
    file,
  });
  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, response, "Pooja added!"));
});

export const removePooja = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required field");

  const response = await removePoojaService({ id });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Requested data is deleted"),
    );
});

export const updatePooja = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required field");

  const { poojaName, description, price } = req.validated.body;
  const file = req.file;

  if (
    poojaName === undefined &&
    description === undefined &&
    price === undefined &&
    !file
  )
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "At least one field is required to update",
    );

  const response = await updatePoojaService({
    id,
    poojaName,
    description,
    price,
    file,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Pooja updated!"));
});

export const getAllPooja = asyncHandler(async (req, res) => {
  const poojas = await Pooja.find().lean();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        poojas,
        poojas.length ? "All pooja" : "No pooja is listed",
      ),
    );
});
