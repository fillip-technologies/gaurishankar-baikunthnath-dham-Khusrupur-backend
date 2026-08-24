import mongoose from "mongoose";

const poojaBookingSchema = new mongoose.Schema(
  {
    pooja: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pooja",
      required: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
      index: true,
    },

    receiptSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const PoojaBooking = mongoose.model("PoojaBooking", poojaBookingSchema);
