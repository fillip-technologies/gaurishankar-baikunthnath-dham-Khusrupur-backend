import mongoose from "mongoose";

// A grouping for the bookable pooja catalogue (e.g. "पूजा / संस्कार",
// "वाहन पूजा"). Every pooja is filed under exactly one category. Categories are
// created by admins from the dashboard, on the fly.
const poojaCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      minlength: [2, "Category name must be at least 2 characters long"],
      maxlength: [60, "Category name must not exceed 60 characters"],
    },
  },
  { timestamps: true },
);

export const PoojaCategory = mongoose.model(
  "PoojaCategory",
  poojaCategorySchema,
);
