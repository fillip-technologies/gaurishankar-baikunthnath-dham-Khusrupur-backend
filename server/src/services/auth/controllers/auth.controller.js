import {
  httpOptions,
  accessCookieOptions,
  refreshCookieOptions,
  deviceCookieOptions,
  challengeCookieOptions,
} from "../../../constants/httpOptions.constants.js";
import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  createAdminService,
  loginService,
  refreshTokenService,
  removeAdminService,
  verifyLoginOtpService,
} from "../services/auth.service.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { updatePasswordService } from "../services/auth.service.js";
import { Admin } from "../models/user.model.js";
import { envConfig } from "../../../configs/env.config.js";

const getDeviceInfo = (req) => ({
  deviceId: req.cookies?.deviceId,
  userAgent: req.headers["user-agent"],
  ip: req.ip,
});

const sanitizeUser = (user) => {
  // Accepts either a Mongoose document or a plain (lean) object.
  const userData =
    typeof user?.toObject === "function" ? user.toObject() : { ...user };
  delete userData.password;
  delete userData.refreshToken;
  delete userData.sessionId;
  delete userData.trustedDevices;
  delete userData.loginOtp;
  delete userData.otpExpiry;
  return userData;
};

// ################     Login     #############
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const { deviceId, userAgent, ip } = getDeviceInfo(req);

  const result = await loginService({
    email,
    password,
    deviceId,
    userAgent,
    ip,
  });

  if (result.requiresOtp) {
    return res
      .status(HTTP_STATUS.OK)
      .cookie("loginChallenge", result.challengeToken, challengeCookieOptions)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { requiresOtp: true, email: result.email },
          "New device detected. An OTP has been sent to your email.",
        ),
      );
  }

  const userData = sanitizeUser(result.user);

  res
    .status(HTTP_STATUS.OK)
    .cookie("accessToken", result.accessToken, accessCookieOptions)
    .cookie("refreshToken", result.refreshToken, refreshCookieOptions)
    .cookie("deviceId", result.deviceId, deviceCookieOptions)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          user: userData,
        },
        "Login successful",
      ),
    );
});

// ##########   Verify new-device login OTP   ##########
export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { otp } = req.validated.body;

  const challengeToken = req.cookies?.loginChallenge;
  const { deviceId, userAgent, ip } = getDeviceInfo(req);

  const {
    user,
    accessToken,
    refreshToken,
    deviceId: newDeviceId,
  } = await verifyLoginOtpService({
    challengeToken,
    otp,
    deviceId,
    userAgent,
    ip,
  });

  const userData = sanitizeUser(user);

  res
    .status(HTTP_STATUS.OK)
    .clearCookie("loginChallenge", httpOptions)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .cookie("deviceId", newDeviceId, deviceCookieOptions)
    .json(
      new ApiResponse(HTTP_STATUS.OK, { user: userData }, "Login successful"),
    );
});

// ##############   Update Password        ###############
export const updatePassword = asyncHandler(async (req, res) => {
  const decoded = req.user;

  const { current_password, newpassword } = req.validated.body;

  const user = await updatePasswordService({
    current_password,
    newpassword,
    decoded,
  });

  const userData = user.toObject();
  delete userData.password;
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, null, "Password succesfully changed"),
    );
});

// ##############       Create Admin         #############
export const createAdmin = asyncHandler(async (req, res) => {
  const role = req.user.role;

  if (role !== "superadmin")
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Request forbidden");

  const { fullname, mobile_number, email, password } = req.validated.body;

  const user = await createAdminService({
    fullname,
    mobile_number,
    email,
    password,
  });

  if (!user) throw new ApiError(HTTP_STATUS.CONFLICT, "Problem creating user");

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        null,
        "Admin created successfully. Login credentials have been emailed.",
      ),
    );
});

//  ################   Remove Admin      #############
export const removeAdmin = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "superadmin") {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Request forbidden");
  }

  const { adminEmail, superAdminPassword } = req.validated.body;

  await removeAdminService({
    adminEmail,
    superAdminPassword,
    superAdminId: user._id,
  });

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Admin deleted successfully",
  });
});

export const listAdmin = asyncHandler(async (req, res) => {
  const role = req.user.role;

  if (role !== "superadmin")
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Request Forbidden");

  const admins = await Admin.find({ role: "admin" }).lean();
  const message =
    admins.length > 0 ? "Admins fetched successfully." : "No admins found.";

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, admins, message));
});

export const renewRefreshToken = asyncHandler(async (req, res) => {
  const inComingRefreshToken = req.cookies?.refreshToken;
  const { accessToken, refreshToken } =
    await refreshTokenService(inComingRefreshToken);

  res
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json({ message: "token updated" });
});

export const getAdmin = asyncHandler(async (req, res) => {
  const decoded = req.user
  const userId = req.params.id;

  if(decoded?.role!=="superadmin" && decoded?._id!==userId){
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");
  }

  const user = await Admin.findOne({_id: userId}).lean();
  if (!user) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");
  const admin = sanitizeUser(user);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, admin, "Admin fetched succesfullly"));
});

export const logOut = asyncHandler(async (req, res) => {
  const decoded = req.user;

  const user = await Admin.findOneAndUpdate(
    { email: decoded.email },
    {
      refreshToken: "",
      sessionId: "",
    },
  ).lean();

  if (!user) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Not authorized");

  res
    .status(HTTP_STATUS.OK)
    .clearCookie("accessToken", httpOptions)
    .clearCookie("refreshToken", httpOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, null, "User sucussfully logged out"));
});

// const removeOneAdmin;
