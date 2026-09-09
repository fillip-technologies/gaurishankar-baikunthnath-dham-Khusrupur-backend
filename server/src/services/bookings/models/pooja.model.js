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
    // Which category this pooja is filed under. Intentionally NOT `required` at
    // the schema level: poojas created before categories existed have none, and
    // `.save()` runs full-document validation — a required field here would make
    // those legacy docs uneditable. "Required" is enforced on the add route only
    // (poojaSchema), so every NEW pooja must pick a category.
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PoojaCategory",
      default: null,
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
