import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  buildImageDeliveryUrl,
  buildVideoPosterUrl,
  buildVideoUrl,
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import Gallery from "../models/gallery.model.js";

// Delivered dimensions: grid cards render at ~300-380px CSS width (2x for
// retina), lightbox/full view caps at ~1280px. Never larger than needed.
const THUMB_WIDTH = 600;
const PREVIEW_WIDTH = 1280;

// Enriches a lean gallery doc with optimized Cloudinary delivery URLs.
// Original `imageUrl` is preserved (used for HD wallpaper downloads and video
// playback); `thumbUrl` feeds the grid and `previewUrl` the lightbox.
const withOptimizedUrls = (doc) => {
  if (!doc.publicId) {
    return { ...doc, thumbUrl: doc.imageUrl, previewUrl: doc.imageUrl };
  }

  if (doc.dataType === "videos") {
    // "Auto" streams the original file; the rest are transcoded to a fixed height.
    const videoSources = [
      { label: "Auto", url: doc.imageUrl },
      { label: "1080p", url: buildVideoUrl(doc.publicId, 1080) },
      { label: "720p", url: buildVideoUrl(doc.publicId, 720) },
      { label: "480p", url: buildVideoUrl(doc.publicId, 480) },
    ];

    return {
      ...doc,
      videoUrl: doc.imageUrl,
      videoSources,
      thumbUrl: buildVideoPosterUrl(doc.publicId, THUMB_WIDTH),
      previewUrl: buildVideoPosterUrl(doc.publicId, PREVIEW_WIDTH),
    };
  }

  return {
    ...doc,
    thumbUrl: buildImageDeliveryUrl(doc.publicId, THUMB_WIDTH),
    previewUrl: buildImageDeliveryUrl(doc.publicId, PREVIEW_WIDTH),
  };
};

export const uploadToGalleryService = async ({
  user,
  title,
  dataType,
  folder,
  file,
}) => {
  const uploadFile = await uploadToCloudinary(file.buffer, "gallery");

  const gallery = await Gallery.create({
    userId: user._id,
    imageUrl: uploadFile.secure_url,
    publicId: uploadFile.public_id,
    contentType: uploadFile.resource_type,
    mimeType: file.mimetype,
    dataType,
    folder: folder?.trim() || undefined,
    title,
  });

  if (!gallery)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to upload to gallery",
    );

  return gallery;
};

export const deleteGalleryDataService = async ({ id }) => {
  const data = await Gallery.findById(id);

  if (!data) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Gallery data not found");
  }

  const deletedFromCloudinary = await deleteFromCloudinary(data.publicId);

  if (!deletedFromCloudinary) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete media",
    );
  }

  await Gallery.findByIdAndDelete(id);

  return {
    message: "Gallery data deleted successfully",
  };
};

// Sentinel folder name for items that were uploaded without a folder.
const UNCATEGORIZED = "Uncategorized";

export const getGalleryDataService = async ({
  dataType,
  folder,
  limit,
  skip,
}) => {
  const query = { dataType };

  if (folder === UNCATEGORIZED) {
    query.$or = [
      { folder: null },
      { folder: "" },
      { folder: { $exists: false } },
    ];
  } else if (folder) {
    query.folder = folder;
  }

  const response = await Gallery.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (response.length < 0)
    throw new ApiError(HTTP_STATUS.NO_CONTENT, "No Content");

  return response.map(withOptimizedUrls);
};

// Groups a dataType's items into folders, returning each folder's item count and
// a cover thumbnail (the most recently uploaded item in that folder).
export const getGalleryFoldersService = async ({ dataType }) => {
  const grouped = await Gallery.aggregate([
    { $match: { dataType } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $let: {
            vars: { f: { $ifNull: ["$folder", ""] } },
            in: {
              $cond: [{ $eq: ["$$f", ""] }, UNCATEGORIZED, "$$f"],
            },
          },
        },
        count: { $sum: 1 },
        coverPublicId: { $first: "$publicId" },
        coverImageUrl: { $first: "$imageUrl" },
      },
    },
  ]);

  const isVideo = dataType === "videos";

  const folders = grouped.map((g) => {
    const coverThumbUrl = g.coverPublicId
      ? isVideo
        ? buildVideoPosterUrl(g.coverPublicId, THUMB_WIDTH)
        : buildImageDeliveryUrl(g.coverPublicId, THUMB_WIDTH)
      : g.coverImageUrl;

    return { folder: g._id, count: g.count, coverThumbUrl };
  });

  // Alphabetical, with the "Uncategorized" bucket always last.
  folders.sort((a, b) => {
    if (a.folder === UNCATEGORIZED) return 1;
    if (b.folder === UNCATEGORIZED) return -1;
    return a.folder.localeCompare(b.folder);
  });

  return folders;
};
