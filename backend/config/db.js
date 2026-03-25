const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri || typeof uri !== "string") {
      throw new Error("MONGO_URI is missing or not a string. Set this in your .env file.");
    }

    await mongoose.connect(uri); // ✅ use variable

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;