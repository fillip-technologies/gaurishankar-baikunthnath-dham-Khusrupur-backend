import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    imageurl: {
      type: String,
    },
    publicId: {
      type: String,
    },
    eventName: {
      type: String,
      trim: true,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const Event = mongoose.model("Event", eventSchema);
