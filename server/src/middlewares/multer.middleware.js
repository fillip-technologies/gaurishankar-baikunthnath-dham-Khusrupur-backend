import multer from "multer";

import path from "path";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";

const storage = multer.memoryStorage();

const allowedTypes = ["image", "videos"];

const allowedExtension = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg", // images
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm", // videos
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
];

const fileFilter = (req, file, cb) => {
  const mimeAllowed = allowedTypes.some((type) =>
    file.mimetype.startsWith(type),
  );
  const ext = path.extname(file.originalname).toLowerCase();
  const extAllowed = allowedExtension.includes(ext);

  if (
    mimeAllowed ||
    (file.mimetype === "application/octet-stream" && extAllowed)
  ) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Only image and videos all allowed",
      ),
      false,
    );
  }
};

export const upload = multer({
    storage,
    limits: {
        fileSize : 5*1024*1024
    },
    fileFilter
})
