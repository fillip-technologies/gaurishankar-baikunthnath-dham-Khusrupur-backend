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
    source: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["print", "tv", "digital"],
      default: "print",
      index: true,
    },
    publicationDate: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
    highlights: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    readTime: {
      type: String,
      trim: true,
    },
    quote: {
      type: String,
      trim: true,
    },
    quoteAuthor: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: "Published",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const MediaCoverage = mongoose.model("MediaCoverage", mediaCoverageSchema);

export default MediaCoverage;
