import mongoose from "mongoose";

const shringarSchema = new mongoose.Schema(
  {
    title: {
        type: String,
        trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      required: true,
    },
    publicId: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true },
);

export const Shringar = mongoose.model("Shringar", shringarSchema);
