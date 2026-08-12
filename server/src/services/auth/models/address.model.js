import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    houseName: {
      type: String,
      trim: true,
    },

    locality: {
      type: String,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    zipcode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, "Zipcode must be exactly 6 digits"],
    },

    country: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);

export default Address;