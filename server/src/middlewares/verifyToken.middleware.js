import { envConfig } from "../configs/env.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { Admin } from "../services/auth/models/user.model.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const verifyJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token || token.trim() === "")
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");
    const decoded = jwt.verify(token, envConfig.ACCESS_TOKEN_SECRET);
    const user = await Admin.findById(decoded._id).select("+sessionId");
    if (!user) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");

    if (user.sessionId !== decoded.sessionId)
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

