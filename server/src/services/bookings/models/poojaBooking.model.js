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
    // Where the booking came from. Online bookings go through Razorpay and carry a
    // linked `payment`; manual bookings are logged at the counter by an admin and
    // instead keep the payer snapshot + payment mode inline (there is no Payment).
    source: {
      type: String,
      enum: ["online", "manual"],
      default: "online",
    },
    // Payer snapshot for manual bookings. Online bookings read this off the linked
    // Payment; manual bookings have no Payment, so it is stored here directly.
    payer: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
    },
    // How a manual booking was paid (e.g. "Cash at Counter", "UPI"). Null for
    // online bookings, whose mode is implied by the Razorpay payment.
    paymentMode: {
      type: String,
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // The date the devotee wants the pooja performed (chosen at checkout).
    bookingDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      // pending/confirmed/failed are system-driven (checkout + payment webhook);
      // completed/cancelled are set by an admin from the dashboard.
      enum: ["pending", "confirmed", "completed", "cancelled", "failed"],
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
