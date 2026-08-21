import ApiError from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const createEvent = asyncHandler(async (req, res) => {
  const user = req.user;
  const file = req.file;
  if(!file) throw new ApiError()
  const { eventName, title, description } = req.validated.body;

  const response = await createEventService({ user, eventName, title, description , file});

  return res.status()
});
