const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri || typeof uri !== "string") {
      throw new Error(
        "MONGO_URI is missing or invalid. Set it in your .env or Vercel environment variables."
      );
    }

    // ✅ Mongoose 6+ doesn't need these options anymore, but bufferCommands
    // false is recommended for serverless to avoid hanging connections
    await mongoose.connect(uri, {
      bufferCommands: false,     // Don't buffer commands if not connected
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
    });

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Connection Error:", error.message);
    // ✅ Throw instead of process.exit(1) for serverless compatibility
    // process.exit causes issues in Vercel serverless functions
    throw error;
  }
};

module.exports = connectDB;