import mongoose from "mongoose";

const pujaSchema = new mongoose.Schema(
  {
    pujaName: {
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

const Puja = mongoose.model("Puja", pujaSchema);
