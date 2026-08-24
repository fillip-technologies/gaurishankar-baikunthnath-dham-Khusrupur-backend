import mongoose from "mongoose";

// A bookable room *type* (e.g. "Deluxe AC", "Dormitory"). `totalRooms` is the
// inventory the temple owns for this type; `availableRooms` is how many are free
// right now — it drops on check-in and rises on check-out.
const roomSchema = new mongoose.Schema(
  {
    roomType: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      minlength: [3, "Description must be at least 3 character long"],
    },
    facilities: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      required: true,
    },
    totalRooms: {
      type: Number,
      min: [0, "Total rooms cannot be negative"],
      required: true,
    },
    availableRooms: {
      type: Number,
      min: [0, "Available rooms cannot be negative"],
      required: true,
    },
  },
  { timestamps: true },
);

export const Room = mongoose.model("Room", roomSchema);
