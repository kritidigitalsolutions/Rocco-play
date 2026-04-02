const mongoose = require("mongoose");

let connectionPromise = null;

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 0);

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

  // If a connection attempt is already running, await it instead of starting another.
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  connectionPromise = mongoose
    .connect(uri, {
      // ✅ Fail fast — don't hang for minutes trying to find a server
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 30000,

      // ✅ Recommended for serverless connection pooling
      maxPoolSize: 10,
      minPoolSize: 0,
    })
    .finally(() => {
      connectionPromise = null;
    });

  await connectionPromise;

  console.log("✅ MongoDB Connected");
};

module.exports = connectDB;