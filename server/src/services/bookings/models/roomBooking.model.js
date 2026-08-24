import mongoose from "mongoose";

const roomBookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    // Number of rooms of this type booked.
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
    },
    // Payment lifecycle: whether the money settled.
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
      index: true,
    },
    // Stay lifecycle: drives the check-in / check-out availability adjustments.
    // A booking must be `confirmed` (paid) and `booked` to be checked in.
    stayStatus: {
      type: String,
      enum: ["booked", "checked_in", "checked_out"],
      default: "booked",
      index: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    receiptSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const RoomBooking = mongoose.model("RoomBooking", roomBookingSchema);
