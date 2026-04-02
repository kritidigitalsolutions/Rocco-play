const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || typeof uri !== "string") {
    throw new Error(
      "MONGO_URI is missing. Add it to your Vercel environment variables."
    );
  }

  // ✅ Skip if already connected (serverless warm invocations reuse the connection)
  if (mongoose.connection.readyState === 1) {
    console.log("✅ MongoDB already connected (reusing)");
    return;
  }

  await mongoose.connect(uri, {
    // ✅ Critical for serverless: don't buffer operations if not connected
    bufferCommands: false,

    // ✅ Fail fast — don't hang for minutes trying to find a server
    serverSelectionTimeoutMS: 5000,   // Give up finding a server after 5s
    connectTimeoutMS: 8000,           // TCP connection timeout 8s
    socketTimeoutMS: 30000,           // Socket idle timeout 30s

    // ✅ Recommended for serverless connection pooling
    maxPoolSize: 10,
    minPoolSize: 0,
  });

  console.log("✅ MongoDB Connected");
};

module.exports = connectDB;