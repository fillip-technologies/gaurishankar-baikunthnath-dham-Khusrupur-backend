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

    dataType: {
      type: String,
      enum: ["photos", "wallpaper", "mediaCoverage", "videos"],
      required: true,
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

const Gallery = mongoose.model("Gallery", gallerySchema);

export default Gallery;
