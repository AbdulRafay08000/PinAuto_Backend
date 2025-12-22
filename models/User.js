import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password_hash: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      trim: true,
    },

    business_name: {
      type: String,
      trim: true,
    },

    timezone: {
      type: String,
      default: "UTC",
    },

    email_notifications: {
      type: Boolean,
      default: true,
    },

    plan_tier: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic",
    },

    pinterest_connected: {
      type: Boolean,
      default: false,
    },

    pinterest_email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    pinterest_password_encrypted: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export default mongoose.model("User", UserSchema);
