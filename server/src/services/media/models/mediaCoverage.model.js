import mongoose from "mongoose";

const mediaCoverageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      select: false
    },

    imageUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    contentType: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const MediaCoverage = mongoose.model("MediaCoverage", mediaCoverageSchema);

export default MediaCoverage;
