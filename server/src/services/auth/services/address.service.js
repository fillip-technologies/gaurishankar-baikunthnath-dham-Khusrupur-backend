import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import Address from "../models/address.model.js";

export const updateAddressService = async ({ decoded, ...fields }) => {
  if (!decoded)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "You are not authorized");


  // Only include fields that were actually provided, so a partial update leaves
  // the user's other saved address fields untouched.
  const update = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) update[key] = value;
  }

  // An empty `$set` is rejected by MongoDB, so omit it when nothing was
  // provided (the upsert still creates the doc from the filter's userId).
  const updateOps = {};
  if (Object.keys(update).length > 0) updateOps.$set = update;

  // Update-or-create the single address for this user (no duplicate documents).
  const address = await Address.findOneAndUpdate(
    { userId: decoded._id },
    updateOps,
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  if (!address)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Problem updating address");

  return address;
};

export const getAddressService = async ({ decoded }) => {
  if (!decoded)
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "You are not authorized");

  const address = await Address.findOne({ userId: decoded._id }).lean();

  if (!address)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Address not found");

  return address;
};
