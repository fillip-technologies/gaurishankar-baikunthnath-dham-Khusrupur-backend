import { envConfig } from "../configs/env.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { Admin } from "../services/auth/models/user.model.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

// Extract + verify the access token only. No DB access — cheap enough to run on
// every authenticated route. Sets req.user to the decoded JWT payload.
export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token || token.trim() === "")
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");

    req.user = jwt.verify(token, envConfig.ACCESS_TOKEN_SECRET);
    next();
  } catch (error) {
    next(error);
  }
};

// Confirms the token's session is still the user's current session (enables
// server-side revocation: logout-all, force-logout on password change, etc.).
// Requires `authenticate` to have run first. Attaches the loaded document as
// req.userDoc so handlers can reuse it without another query.
export const requireValidSession = async (req, res, next) => {
  try {
    const user = await Admin.findById(req.user._id).select("+sessionId");
    if (!user || user.sessionId !== req.user.sessionId)
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");

    req.userDoc = user;
    next();
  } catch (error) {
    next(error);
  }
};
