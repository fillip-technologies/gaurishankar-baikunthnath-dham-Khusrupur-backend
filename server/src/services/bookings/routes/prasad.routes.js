import { Router } from "express";
import { validate } from "../../../middlewares/validate.middleware";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware";
import { upload } from "../../../middlewares/multer.middleware";
import { addPrasadSchema } from "../../../validations/prasad.validator";
import {
  addPrasad,
  getAllPrasad,
  removePrasad,
} from "../controllers/prasad.controllers";
import { apiRateLimiter } from "../../../middlewares/rateLimiter.middleware";

const prasadRouter = Router();

prasadRouter.post(
  "/add",
  authenticate,
  requireValidSession,
  upload.single("file"),
  validate(addPrasadSchema),
  addPrasad,
);

prasadRouter.delete(
  "/remove/:id",
  apiRateLimiter,
  authenticate,
  requireValidSession,
  removePrasad,
);

prasadRouter.get("/prasads", apiRateLimiter, getAllPrasad);


export default prasadRouter;
