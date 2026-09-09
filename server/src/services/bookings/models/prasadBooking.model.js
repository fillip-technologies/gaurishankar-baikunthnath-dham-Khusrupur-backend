import mongoose from "mongoose";

const prasadBookingSchema = new mongoose.Schema(
  {
    prasad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prasad",
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
    // Where the prasad should be shipped. Captured at checkout like a normal
    // e-commerce delivery address; the recipient's name/phone/email live on the
    // linked Payment's `payer` snapshot.
    deliveryAddress: {
      line1: { type: String, trim: true },
      landmark: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
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

export const PrasadBooking = mongoose.model(
  "PrasadBooking",
  prasadBookingSchema,
);
