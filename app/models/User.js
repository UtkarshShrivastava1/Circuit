// app/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password is excluded by default; routes that need it should use .select('+password')
    password: {
      type: String,
      required: true,
      select: false,
    },

    // Optional binary profile image (you may prefer storing only URLs)
    profileImg: {
      type: Buffer,
      default: null,
    },

    // Public-facing image URL (used throughout app)
    profileImgUrl: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer not to say"],
      default: "male",
    },

    role: {
      type: String,
      enum: ["member", "admin", "manager"],
      default: "member",
    },

    phoneNumber: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: Date,
    },

    profileState: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    stateChangedAt: {
      type: Date,
      default: null,
    },

    // For forgot password flow
    forgotpasswordToken: {
      type: String,
      default: "",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    forgotPasswordExpires: {
      type: Date,
      default: Date.now,
    },

    // Relations
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],

    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    leaveHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Leave",
      },
    ],

    leaveBalances: {
      paid: { type: Number, default: 0 },
      // add other leave types if required
    },

    // Generic verification token (you already had these)
    veriyToken: {
      type: String,
      default: "",
    },
    veriyTokenExpires: {
      type: Date,
      default: Date.now,
    },

    // ======================
    // OTP fields for email-based login (passwordless)
    // ======================
    otpHash: {
      type: String,
      select: false, // do not return otp hash by default
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },

    // Any other dynamic fields will be allowed because of strict:false below
  },
  {
    timestamps: true,
    strict: false, // allows adding new fields without schema migration
  }
);

// Optional: indexes for faster lookups (email uniqueness enforced above already)
userSchema.index({ email: 1 }, { unique: true });

// Export existing model if present (avoid OverwriteModelError in dev)
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
