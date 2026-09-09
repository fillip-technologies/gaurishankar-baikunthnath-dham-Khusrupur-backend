import { Router } from "express";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import shringarSchema, {
  shringarUpdateSchema,
} from "../../../validations/shringar.validator.js";
import {
  addShringar,
  deleteShringar,
  getAllShringar,
  getLatestShringar,
  getShringar,
  updateShringar,
} from "../controllers/shringar.controller.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";

const shringarRouter = Router();

shringarRouter.post(
  "/create",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(shringarSchema),
  addShringar,
);

shringarRouter.put(
  "/update/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(shringarUpdateSchema),
  updateShringar,
);

shringarRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  deleteShringar,
);

shringarRouter.get("/all", apiRateLimiter, getAllShringar);
// Public "aaj ka shringar" — must stay above "/:id" so it isn't matched as an id.
shringarRouter.get("/latest", apiRateLimiter, getLatestShringar);
shringarRouter.get("/:id", apiRateLimiter, getShringar);
export default shringarRouter;
