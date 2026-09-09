import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Shringar } from "../models/shringar.model.js";

// Every content field the admin form / seed may send. Applied when creating or
// updating so new fields only need to be listed here (and in the model/validator).
const SCALAR_FIELDS = [
  "title",
  "description",
  "titleEn",
  "titleHi",
  "subtitleEn",
  "subtitleHi",
  "descriptionEn",
  "descriptionHi",
  "date",
  "timeSlot",
  "chant",
  "flowers",
  "chandan",
  "silks",
  "darshanHours",
  "priestName",
  "status",
];

// Keep the "exactly one active" invariant: clear the flag on every other doc.
const deactivateOthers = (exceptId) =>
  Shringar.updateMany(
    exceptId ? { _id: { $ne: exceptId } } : {},
    { $set: { isTodayActive: false } },
  );

export const createShringarService = async ({ fields = {}, file }) => {
  const doc = {};
  for (const key of SCALAR_FIELDS) {
    if (fields[key] !== undefined) doc[key] = fields[key];
  }

  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "shringar");
    if (!upload)
      throw new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Failed to upload image",
      );
    doc.imageUrl = upload.secure_url;
    doc.publicId = upload.public_id;
  }

  // A freshly added shringar becomes the active "aaj ka shringar".
  doc.isTodayActive = true;
  await deactivateOthers();

  const shringar = await Shringar.create(doc);

  if (!shringar)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create shringar",
    );

  return shringar;
};

// Every shringar, newest first (admin archive view).
export const getAllShringarService = async () => {
  return Shringar.find().sort({ createdAt: -1 }).lean();
};

// The currently active "aaj ka shringar" (falls back to the newest record).
export const getLatestShringarService = async () => {
  const active = await Shringar.findOne({ isTodayActive: true }).lean();
  if (active) return active;

  const latest = await Shringar.findOne().sort({ createdAt: -1 }).lean();
  if (!latest) throw new ApiError(HTTP_STATUS.NOT_FOUND, "No shringar is found");

  return latest;
};

export const getShringarByIdService = async ({ id }) => {
  const shringar = await Shringar.findById(id).lean();

  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Requested data can not be found");

  return shringar;
};

// Updates a shringar. Any subset of fields may be provided; a new file replaces
// the image and the old Cloudinary asset is cleaned up.
export const updateShringarService = async ({ id, fields = {}, file }) => {
  const shringar = await Shringar.findById(id);

  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Shringar not found");

  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "shringar");
    const oldPublicId = shringar.publicId;
    shringar.imageUrl = upload.secure_url;
    shringar.publicId = upload.public_id;
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  for (const key of SCALAR_FIELDS) {
    if (fields[key] !== undefined) shringar[key] = fields[key];
  }

  await shringar.save();
  return shringar;
};

// Marks one shringar as the active "aaj ka shringar" and clears the rest.
export const activateShringarService = async ({ id }) => {
  const shringar = await Shringar.findById(id);

  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Shringar not found");

  await deactivateOthers(id);
  shringar.isTodayActive = true;
  await shringar.save();

  return shringar;
};

export const deleteShringarService = async ({ id }) => {
  const shringar = await Shringar.findById(id);

  if (!shringar)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Requested data not found");

  if (shringar.publicId) await deleteFromCloudinary(shringar.publicId);

  const deleted = await Shringar.findByIdAndDelete(id);

  if (!deleted)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem deleting shringar",
    );

  return deleted;
};
