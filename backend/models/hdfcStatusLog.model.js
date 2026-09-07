const mongoose = require("mongoose");

const hdfcStatusLogSchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },
  event: { type: String, required: true },
  request: { type: mongoose.Schema.Types.Mixed, default: null },
  response: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model("HdfcStatusLog", hdfcStatusLogSchema);
