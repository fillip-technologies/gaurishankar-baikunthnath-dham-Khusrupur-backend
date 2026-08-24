import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { Room } from "../models/room.model.js";
import {
  addRoomService,
  removeRoomService,
  updateRoomService,
} from "../services/room.service.js";

export const addRoom = asyncHandler(async (req, res) => {
  const { roomType, description, facilities, price, totalRooms } =
    req.validated.body;
  const file = req.file;

  const response = await addRoomService({
    roomType,
    description,
    facilities,
    price,
    totalRooms,
    file,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, response, "Room added!"));
});

export const removeRoom = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required field");

  const response = await removeRoomService({ id });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Requested data is deleted"),
    );
});

export const updateRoom = asyncHandler(async (req, res) => {
  const id = req.params?.id;
  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required field");

  const { roomType, description, facilities, price, totalRooms } =
    req.validated.body;
  const file = req.file;

  if (
    roomType === undefined &&
    description === undefined &&
    facilities === undefined &&
    price === undefined &&
    totalRooms === undefined &&
    !file
  )
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "At least one field is required to update",
    );

  const response = await updateRoomService({
    id,
    roomType,
    description,
    facilities,
    price,
    totalRooms,
    file,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, response, "Room updated!"));
});

export const getAllRoom = asyncHandler(async (req, res) => {
  const rooms = await Room.find().lean();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        rooms,
        rooms.length ? "All rooms" : "No room is listed",
      ),
    );
});
