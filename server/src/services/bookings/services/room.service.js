import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Room } from "../models/room.model.js";

// Normalises the `facilities` field (CSV string or array) into a clean string[].
const parseFacilities = (facilities) => {
  if (facilities === undefined) return undefined;
  const list = Array.isArray(facilities)
    ? facilities
    : String(facilities).split(/[\n,]/);
  return list.map((f) => f.trim()).filter(Boolean);
};

export const addRoomService = async ({
  roomType,
  description,
  facilities,
  price,
  totalRooms,
  file,
}) => {
  if (!file?.buffer)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Room image is required");

  const existing = await Room.findOne({ roomType }).lean();
  if (existing)
    throw new ApiError(HTTP_STATUS.CONFLICT, "Room type already exists");

  const upload = await uploadToCloudinary(file.buffer);
  if (!upload)
    throw new ApiError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      "Something went wrong",
    );

  const room = await Room.create({
    roomType,
    description,
    facilities: parseFacilities(facilities) ?? [],
    imageUrl: upload.secure_url,
    publicId: upload.public_id,
    price,
    totalRooms,
    // A brand-new room type starts fully available.
    availableRooms: totalRooms,
  });

  if (!room)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem creating room!!",
    );

  return room;
};

export const removeRoomService = async ({ id }) => {
  const requestedData = await Room.findById(id);
  if (!requestedData)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Data not found");

  await deleteFromCloudinary(requestedData.publicId);

  const data = await Room.findByIdAndDelete(id);
  if (!data) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Something went wrong");

  return data;
};

export const updateRoomService = async ({
  id,
  roomType,
  description,
  facilities,
  price,
  totalRooms,
  file,
}) => {
  const room = await Room.findById(id);
  if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Room not found");

  if (roomType !== undefined && roomType !== room.roomType) {
    const duplicate = await Room.findOne({
      roomType,
      _id: { $ne: id },
    }).lean();
    if (duplicate)
      throw new ApiError(HTTP_STATUS.CONFLICT, "Room type already exists");
  }

  if (roomType !== undefined) room.roomType = roomType;
  if (description !== undefined) room.description = description;
  if (price !== undefined) room.price = price;

  const parsedFacilities = parseFacilities(facilities);
  if (parsedFacilities !== undefined) room.facilities = parsedFacilities;

  // Resizing the inventory: shift availableRooms by the same delta so currently
  // occupied rooms stay accounted for, and never let it fall below 0 or exceed
  // the new total.
  if (totalRooms !== undefined) {
    const delta = totalRooms - room.totalRooms;
    room.totalRooms = totalRooms;
    room.availableRooms = Math.max(
      0,
      Math.min(totalRooms, room.availableRooms + delta),
    );
  }

  // Replace the image only after a successful upload, then clean up the old
  // asset once the document is saved so a failed upload never orphans the record.
  const oldPublicId = room.publicId;
  let uploadedNewImage = false;
  if (file?.buffer) {
    const upload = await uploadToCloudinary(file.buffer);
    if (!upload)
      throw new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Something went wrong",
      );
    room.imageUrl = upload.secure_url;
    room.publicId = upload.public_id;
    uploadedNewImage = true;
  }

  const updated = await room.save();

  if (uploadedNewImage && oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return updated;
};
