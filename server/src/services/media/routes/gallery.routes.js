import { Router } from "express";
import { upload } from "../../../middlewares/multer.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  galleryFoldersSchema,
  galleryGetSchema,
  galleryPostSchema,
  mediaSchema,
  mediaUpdateSchema,
} from "../../../validations/media.validator.js";
import {
  deleteGalleryData,
  getGalleryData,
  getGalleryFolders,
  uploadToGallery,
} from "../controllers/gallery.controller.js";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";
import {
  createMedia,
  deleteMedia,
  getAllMedia,
  getMedia,
  updateMedia,
} from "../controllers/mediaCoverage.controller.js";

const mediaRouter = Router();

mediaRouter.post(
  "/galleryUpload",
  apiRateLimiter,
  authenticate,
  upload.single("file"),
  validate(galleryPostSchema),
  uploadToGallery,
);

mediaRouter.delete(
  "/gallery/:id",
  apiRateLimiter,
  authenticate,
  deleteGalleryData,
);

mediaRouter.get(
  "/gallery/folders",
  apiRateLimiter,
  validate(galleryFoldersSchema),
  getGalleryFolders,
);

mediaRouter.get(
  "/gallery",
  apiRateLimiter,
  validate(galleryGetSchema),
  getGalleryData,
);

mediaRouter.post(
  "/mediaCoverage",
  apiRateLimiter,
  authenticate,
  upload.single("file"),
  validate(mediaSchema),
  createMedia,
);

mediaRouter.patch(
  "/mediaCoverage/:id",
  apiRateLimiter,
  authenticate,
  upload.single("file"),
  validate(mediaUpdateSchema),
  updateMedia,
);

mediaRouter.delete(
  "/mediaCoverage",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  deleteMedia,
);
mediaRouter.get("/mediaCoverage/:id", apiRateLimiter, getMedia);

mediaRouter.get("/mediaCoverage", apiRateLimiter, getAllMedia);

export default mediaRouter;
