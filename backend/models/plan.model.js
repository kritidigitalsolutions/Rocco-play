const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: {
    type: String, // Basic, Premium
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in days (30, 365)
    required: true
  },
  features: [String],

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Plan", planSchema);