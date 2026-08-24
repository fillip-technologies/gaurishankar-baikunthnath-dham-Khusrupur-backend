import mongoose from "mongoose";

const poojaSchema = new mongoose.Schema(
  {
    poojaName: {
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
  },
  { timestamps: true },
);

export const Pooja = mongoose.model("Pooja", poojaSchema);
