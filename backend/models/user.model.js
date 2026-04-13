const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "User" },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true   // ✅ IMPORTANT FIX
    },

    phone: {
      type: String,
      required: true,
      unique: true
    },

    profileImage: {
      type: String
    },

    profileComplete: {
      type: Boolean,
      default: false
    },
    // for notification
    fcmToken: {
      type: String,
      default: null
    },

    role: {
      type: String,
      default: "USER"
    },
    subscriptions: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  }
]
  },
  { timestamps: true }
);

// ✅ prevent overwrite error
module.exports = mongoose.model("User", userSchema);
