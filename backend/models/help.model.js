const mongoose = require("mongoose");

const helpSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        "cancel-subscription",
        "contact-support",
        "account-help",
        "report-problem",
        "faq"
      ]
    },

    question: {
      type: String,
      required: true
    },

    answer: {
      type: String,
      required: true
    },

    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Help", helpSchema);