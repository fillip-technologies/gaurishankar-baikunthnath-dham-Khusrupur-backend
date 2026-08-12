import mongoose from "mongoose";

const accessControlSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
    },

    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  { timestamps: true },
);

const AccessControl = mongoose.model("AccessControl", accessControlSchema);

export default AccessControl;
