// Serverless entrypoint for Vercel
require("dotenv").config();

const serverless = require("serverless-http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await Promise.race([
    connectDB(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB connection timeout after 8s")), 8000)
    ),
  ]);
};

const toPathname = (url = "") => url.split("?")[0] || "/";

module.exports = async (req, res) => {
  const incomingPath = toPathname(req.url);

  if (incomingPath === "/api") {
    req.url = "/";
  } else if (incomingPath.startsWith("/api/")) {
    req.url = req.url.replace("/api", "") || "/";
  }

  const normalizedPath = toPathname(req.url);

  if (normalizedPath === "/favicon.ico") {
    res.status(204).end();
    return;
  }

  if (req.method !== "OPTIONS" && normalizedPath !== "/") {
    try {
      await connectDatabase();
    } catch (err) {
      console.error("Failed to connect to DB:", err.message);
      res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. DB connection failed.",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
      return;
    }
  }

  return serverless(app)(req, res);
};
