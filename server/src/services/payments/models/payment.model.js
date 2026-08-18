import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    // Denormalised payer snapshot. Kept on the payment itself so the record stays
    // self-contained for receipts, refunds and audit — independent of any User /
    // Booking document that might later change or be removed.
    payer: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
    },

    // What this payment is for. `purpose` is a coarse category; `reference` points
    // at the domain document (e.g. a Booking) that owns this payment. This is what
    // lets any service reuse the payments module without payments knowing about it.
    purpose: {
      type: String,
      enum: ["booking", "donation", "general"],
      default: "general",
      index: true,
    },

    reference: {
      // Model name, e.g. "Booking". Drives dynamic population via refPath.
      model: { type: String, default: null },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "reference.model",
        default: null,
      },
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["created", "pending", "successful", "failed", "refunded"],
      default: "created",
    },

    // Free-form key/value passthrough (mirrors Razorpay order notes).
    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Fast lookup of "all payments for this booking / donation / …".
paymentSchema.index({ "reference.model": 1, "reference.id": 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
