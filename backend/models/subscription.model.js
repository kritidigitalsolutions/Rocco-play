// const mongoose = require("mongoose");

// const subscriptionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },
//   plan: String,
//   status: String, // active, cancelled, expired
//   subscriptionId: String,
//   startDate: Date,
//   endDate: Date,
// }, { timestamps: true });

// module.exports = mongoose.model("Subscription", subscriptionSchema);

const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // plan: {
    //   type: String,
    //   enum: ["monthly", "yearly"],
    //   required: true,
    // },
    plan: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Plan",
  required: true
},

    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },

    // subscriptionId: {
    //   type: String,
    // //   required: true,
    //   unique: true,
    //   default: null
    // },
subscriptionId: {
  type: String,
  default: null,   // optional
},
    paymentId: {
  type: String,
  unique: true,
  sparse: true
},

    amount: Number,

    currency: {
      type: String,
      default: "INR",
    },

    startDate: Date,

    endDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);