// const mongoose = require("mongoose");

// const otpSchema = new mongoose.Schema(
//   {
//     phone: {
//       type: String,
//       required: true,
//     },
//     otp: {
//       type: String,
//       required: true,
//     },
//    expiresAt: {
//             type: Date,
//             required: true,
//             default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//             index: { expires: 0 }, // Auto-delete after expiry
//         },
//   },
//   { timestamps: true }
// );


//     module.exports = mongoose.model("OTP", otpSchema);

const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    // 🔥 identifier = email OR phone
    identifier: {
      type: String,
      required: true,
    },

    // 🔥 type = tells what identifier is
    type: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // auto delete after expiry
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OTP", otpSchema);