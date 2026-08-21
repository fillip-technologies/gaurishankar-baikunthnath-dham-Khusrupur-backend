import { Router } from "express";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware.js";
import { upload } from "../../../middlewares/multer.middleware.js";
import {
  addShringar,
  deleteShringar,
  getAllShringar,
  getShringar,
} from "../controllers/shringar.controller.js";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware.js";

const shringarRouter = Router();

shringarRouter.post(
  "/create",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  upload.single("file"),
  addShringar,
);

shringarRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  deleteShringar,
);

shringarRouter.get("/all", apiRateLimiter, getAllShringar);
shringarRouter.get("/:id", apiRateLimiter, getShringar);
export default shringarRouter;
