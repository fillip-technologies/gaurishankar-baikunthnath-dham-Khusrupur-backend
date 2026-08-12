import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    action: {
      type: String,
      required: true,
      enum: ["read", "create", "update", "delete"],
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

permissionSchema.index(
  { resource: 1, action: 1 },
  { unique: true }
);

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;