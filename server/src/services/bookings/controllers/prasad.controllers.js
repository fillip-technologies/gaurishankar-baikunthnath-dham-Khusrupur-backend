import { HTTP_STATUS } from "../../../constants/httpStatus.constants";
import ApiResponse from "../../../utils/ApiResponse";
import { asyncHandler } from "../../../utils/asyncHandler";
import { Prasad } from "../models/prasad.model";
import {
  addPrasadService,
  deletePrasadService,
} from "../services/prasad.services";

export const addPrasad = asyncHandler(async (req, res) => {
  const { prasadName, priceperkg, description } = req.validated.body;
  const file = req.file;
  const response = await addPrasadService({
    prasadName,
    priceperkg,
    description,
    file,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Prasad added!"));
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
