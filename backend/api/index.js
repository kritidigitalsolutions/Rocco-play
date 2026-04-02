// ✅ CRITICAL: dotenv MUST be first — before any require() that uses process.env
require("dotenv").config();

const serverless = require("serverless-http");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");

// ✅ Use mongoose connection state instead of a module-level flag
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    // Already connected — reuse existing connection
    return;
  }

  // ✅ Hard timeout: if DB doesn't connect in 8s, fail fast with 503
  // instead of hanging for 300s and getting a Vercel timeout
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

  // Support both /api/* and /* request styles by normalizing to Express route paths.
  if (incomingPath === "/api") {
    req.url = "/";
  } else if (incomingPath.startsWith("/api/")) {
    req.url = req.url.replace("/api", "") || "/";
  }

  const normalizedPath = toPathname(req.url);

  // Never spend cold-start DB time on browser noise routes.
  if (normalizedPath === "/favicon.ico") {
    res.status(204).end();
    return;
  }

  // Allow health checks and CORS preflight without forcing DB connection.
  if (req.method !== "OPTIONS" && normalizedPath !== "/") {
    try {
      await connectDatabase();
    } catch (err) {
      console.error("❌ Failed to connect to DB:", err.message);
      // Return 503 immediately instead of hanging
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