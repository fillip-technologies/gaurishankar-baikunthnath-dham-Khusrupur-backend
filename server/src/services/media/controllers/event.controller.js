import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  createEventService,
  deleteEventService,
  getEventsByDateService,
  updateEventService,
} from "../services/event.services.js";

export const createEvent = asyncHandler(async (req, res) => {
  const user = req.user;
  const file = req.file;

  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "file is needed");
  const { eventName, title, description, eventDate } = req.validated.body;

  const response = await createEventService({
    user,
    eventName,
    title,
    description,
    eventDate,
    file,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        response,
        "Event created succesfully!",
      ),
    );
});

// Events happening today.
export const getTodayEvent = asyncHandler(async (req, res) => {
  const events = await getEventsByDateService({ date: new Date() });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        events,
        "Today's events fetched successfully",
      ),
    );
});

// Events on a date chosen from a date picker (?date=2026-08-21).
export const getEventsByDate = asyncHandler(async (req, res) => {
  const { date } = req.validated.query;

  const events = await getEventsByDateService({ date });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, events, "Events fetched successfully"),
    );
});

// Updates an event by id (any subset of fields, optionally a new image).
export const updateEvent = asyncHandler(async (req, res) => {
  const id = req.params?.id;

  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Event id is required");

  const response = await updateEventService({
    id,
    fields: req.validated.body,
    file: req.file,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Event updated successfully"),
    );
});

// Removes an event by id.
export const deleteEvent = asyncHandler(async (req, res) => {
  const id = req.params?.id;

  if (!id) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Event id is required");

  const deleted = await deleteEventService({ id });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, deleted, "Event deleted successfully"),
    );
});
