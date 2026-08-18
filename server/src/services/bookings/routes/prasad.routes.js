import { Router } from "express";
import { validate } from "../../../middlewares/validate.middleware";
import {
  authenticate,
  requireValidSession,
} from "../../../middlewares/verifyToken.middleware";
import { upload } from "../../../middlewares/multer.middleware";
import { addPrasadSchema } from "../../../validations/prasad.validator";
import { addPrasad, removePrasad } from "../controllers/prasad.controllers";

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
  authenticate,
  requireValidSession,
  removePrasad,
);

export default prasadRouter;
