import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
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
      select: false,
    },
    mimeType: {
      type: String,
      trim: true,
      select: false,
    },
    occasion: {
      type: String,
      trim: true,
    },
    folder: {
      type: String,
      trim: true,
      index: true,
    },
    dataType: {
      type: String,
      enum: ["photos", "wallpaper", "videos"],
      required: true,
    },

    title: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Gallery = mongoose.model("Gallery", gallerySchema);

export default Gallery;
