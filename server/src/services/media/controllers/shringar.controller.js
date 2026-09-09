import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  activateShringarService,
  createShringarService,
  deleteShringarService,
  getAllShringarService,
  getLatestShringarService,
  getShringarByIdService,
  updateShringarService,
} from "../services/shringar.services.js";

export const addShringar = asyncHandler(async (req, res) => {
  const shringar = await createShringarService({
    fields: req.validated.body,
    file: req.file,
  });

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        shringar,
        "Shringar created succesfully",
      ),
    );
});

export const updateShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shringar id is required");

  const shringar = await updateShringarService({
    id,
    fields: req.validated.body,
    file: req.file,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, shringar, "Shringar updated succesfully"),
    );
});

// Marks a shringar as the active "aaj ka shringar" shown publicly.
export const activateShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shringar id is required");

  const shringar = await activateShringarService({ id });

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, shringar, "Shringar set as active"),
    );
});

export const deleteShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shringar id is required");

  const deleted = await deleteShringarService({ id });

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, deleted, "Data deleted succesfully"));
});

export const getAllShringar = asyncHandler(async (req, res) => {
  const shringar = await getAllShringarService();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        shringar,
        shringar.length ? "All shringar are found" : "No shringar is found",
      ),
    );
});

// The currently active "aaj ka shringar" (the most recently added one).
export const getLatestShringar = asyncHandler(async (req, res) => {
  const shringar = await getLatestShringarService();

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, shringar, "Latest shringar found"));
});

export const getShringar = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id needs to be passed");

  const shringar = await getShringarByIdService({ id });

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, shringar, "OK"));
});
