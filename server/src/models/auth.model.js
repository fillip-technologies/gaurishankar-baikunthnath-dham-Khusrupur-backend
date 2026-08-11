import mongoose from "mongoose";
import { envConfig } from "../config/env.config.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      trim: true,
      required: true,
      minlength: [3, "Name must be atleast 3 characters long"],
    },
    mobile_number: {
      type: String,
      trim: true,
      required: true,
      minlength: [10, "Number must be atleast 10 characters long"],
      maxlength: [14, "Mobile Number cannot exceed 14 characters"],
      match: [/^\d{10,14}$/, "Mobile number must contain 10-14 digits"],
    },
    email: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    address: {
      locality: {
        houseName: {
          type: String,
          trim: true,
        },
        district: {
          type: String,
          trim: true,
        },
      },
      state: {
        type: String,
        trim: true,
      },
      zipcode: {
        type: String,
        match: [/^\d{6}$/, "Zipcode must be exactly 6 digits"],
      },
      country: {
        type: String,
      },
    },
    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
      unique: true,
      minlength: [6, "Password must be atleast 6 characters long"],
    },
    sessionId: {
      type: String,
      default: null,
      select: false,
    },
    trustedDevices: {
      type: [
        {
          deviceHash: { type: String, required: true },
          userAgent: { type: String },
          ip: { type: String },
          lastUsedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
      trim: true,
    },
    loginOtp: {
      type: String,
      trim: true,
      select: false,
    },
    otpExpiry: {
      type: Date,
    },
  },
  { timestamps: true },
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(
    this.password,
    Number(envConfig.SALT_ROUND),
  );
});

adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};
adminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email, role: this.role , sessionId: this.sessionId},
    envConfig.ACCESS_TOKEN_SECRET,
    {
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};

adminSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    envConfig.REFRESH_TOKEN_SECRET,
    { expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN },
  );
};

export const Admin = mongoose.model("Admin", adminSchema);
