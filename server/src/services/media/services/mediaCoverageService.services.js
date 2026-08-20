import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../utils/cloudinary.js";
import MediaCoverage from "../models/mediaCoverage.model.js";

// Splits a CSV / newline-separated string into a trimmed, non-empty array.
const toArray = (str) => {
  if (Array.isArray(str)) return str;
  if (!str || typeof str !== "string") return [];
  return str
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

export const createMediaService = async ({ fields, file }) => {
  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No file uploaded");
  const data = await uploadToCloudinary(file.buffer, "mediaCoverage");

  const {
    title,
    source,
    category,
    description,
    publicationDate,
    tags,
    highlights,
    author,
    location,
    readTime,
    quote,
    quoteAuthor,
    status,
  } = fields;

  const response = await MediaCoverage.create({
    userId: fields.userId,
    imageUrl: data.secure_url,
    publicId: data.public_id,
    contentType: data.resource_type,
    mimeType: file.mimetype,
    title,
    source,
    category,
    description,
    publicationDate: publicationDate ? new Date(publicationDate) : undefined,
    tags: toArray(tags),
    highlights: toArray(highlights),
    author,
    location,
    readTime,
    quote,
    quoteAuthor,
    status,
  });

  if (!response)
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Something went Wrong");

  return response;
};

export const updateMediaService = async ({ mediaId, fields, file }) => {
  const media = await MediaCoverage.findById(mediaId);
  if (!media)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Requested data cant be found");

  // Replace the image if a new file was provided; clean up the old asset.
  if (file) {
    const data = await uploadToCloudinary(file.buffer, "mediaCoverage");
    const oldPublicId = media.publicId;
    media.imageUrl = data.secure_url;
    media.publicId = data.public_id;
    media.contentType = data.resource_type;
    media.mimeType = file.mimetype;
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  // Apply only the fields that were actually provided.
  const scalarFields = [
    "title",
    "source",
    "category",
    "description",
    "author",
    "location",
    "readTime",
    "quote",
    "quoteAuthor",
    "status",
  ];
  for (const key of scalarFields) {
    if (fields[key] !== undefined) media[key] = fields[key];
  }

  if (fields.publicationDate !== undefined)
    media.publicationDate = fields.publicationDate
      ? new Date(fields.publicationDate)
      : undefined;
  if (fields.tags !== undefined) media.tags = toArray(fields.tags);
  if (fields.highlights !== undefined)
    media.highlights = toArray(fields.highlights);

  await media.save();
  return media;
};

export const deleteMediaService = async ({ mediaId }) => {
  const deleteData = await MediaCoverage.findById(mediaId);
  if (!deleteData)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Requested data cant be found");

  await deleteFromCloudinary(deleteData.publicId);

  const res = await MediaCoverage.findByIdAndDelete(mediaId);

  return res;
};
