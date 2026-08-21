import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Event } from "../models/events.model.js";

// Returns [startOfDay, endOfDay] bounds for the calendar day of `date`, so a
// stored eventDate (which may carry a time component) still matches when the
// caller only cares about the day.
const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const createEventService = async ({
  user,
  eventName,
  title,
  description,
  eventDate,
  file,
}) => {
  const upload = await uploadToCloudinary(file.buffer, "event");

  if (!upload)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Something went wrong");

  const response = await Event.create({
    userId: user._id,
    eventName,
    title,
    description,
    eventDate,
    imageurl: upload.secure_url,
    publicId: upload.public_id,
  });

  if (!response)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Problem creating event");
  return response;
};

// Fetches every event whose eventDate falls on the given calendar day.
export const getEventsByDateService = async ({ date }) => {
  const { start, end } = getDayRange(date);

  const events = await Event.find({
    eventDate: { $gte: start, $lte: end },
  }).sort({ eventDate: 1, createdAt: -1 });

  return events;
};

// Updates an event. Any subset of fields may be provided; a new file replaces
// the image and the old Cloudinary asset is cleaned up.
export const updateEventService = async ({ id, fields, file }) => {
  const event = await Event.findById(id);

  if (!event) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Event not found");

  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "event");
    const oldPublicId = event.publicId;
    event.imageurl = upload.secure_url;
    event.publicId = upload.public_id;
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  const scalarFields = ["eventName", "title", "description", "eventDate"];
  for (const key of scalarFields) {
    if (fields[key] !== undefined) event[key] = fields[key];
  }

  await event.save();
  return event;
};

// Removes an event and its associated Cloudinary asset.
export const deleteEventService = async ({ id }) => {
  const event = await Event.findById(id);

  if (!event) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Event not found");

  await deleteFromCloudinary(event.publicId);

  const deleted = await Event.findByIdAndDelete(id);

  if (!deleted)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem deleting event",
    );

  return deleted;
};
