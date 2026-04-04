const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
// ✅ NOTE: dotenv.config() is called in index.js BEFORE this module is required
// Do NOT call it here — it would run before env vars are loaded in serverless context

const app = express();

const mountRoute = (path, router) => {
  app.use(path, router);
  app.use(`/api${path}`, router);
};

const isAllowedOrigin = (origin = "") => {
  const extraOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
    ...extraOrigins,
  ].filter(Boolean);

  const isVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  return allowedOrigins.includes(origin) || isVercelOrigin;
};

// ================= SECURITY MIDDLEWARE =================

// ✅ Helmet for security headers
app.use(helmet());

// ✅ CORS - origins evaluated LAZILY per-request so env vars are always available
// Do NOT pre-build the allowedOrigins array at module load time (env not ready yet)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn("⚠️ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
}));

// Explicit preflight handling helps avoid route-level 404 on OPTIONS in some deployments.
app.options(/.*/, (req, res) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  return res.status(204).end();
});

// ================= GENERAL MIDDLEWARE =================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Request logging (skip in test env)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Ensure DB is ready before executing API handlers.
// This prevents intermittent serverless race conditions under concurrent requests.
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  if (req.path === "/" || req.path === "/favicon.ico" || req.path === "/favicon.png") {
    return next();
  }

  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error("DB middleware error:", error.message);
    return res.status(503).json({
      success: false,
      message: "Database unavailable",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ NOTE: /uploads static serving is disabled on Vercel (serverless has no persistent disk).
// Files are uploaded to BunnyCDN and served via CDN URL instead.
// app.use("/uploads", express.static("uploads")); // ← not needed on Vercel

// ================= ROOT ROUTE =================

app.get("/", (req, res) => {
  res.json({
    message: "Rocco Play API is running 🚀",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
  res.status(204).end();
});

// ================= ADMIN AUTH =================

const adminAuthRoutes = require('./routes/admin/auth.routes');
mountRoute('/admin/auth', adminAuthRoutes);

// ================= USER ROUTES =================

const userAuthRoutes = require('./routes/user/auth.routes');
const userProfileRoutes = require('./routes/user/user.routes');
mountRoute('/user', userProfileRoutes);
mountRoute('/user/auth', userAuthRoutes);

// ================= LEGAL =================

const legalRoutes = require('./routes/admin/legal.routes');
const userLegalRoutes = require('./routes/user/legal.routes');
mountRoute('/admin/legal', legalRoutes);
mountRoute('/user/legal', userLegalRoutes);

// ================= HELP =================

const helpRoutes = require('./routes/admin/help.routes');
const userHelpRoutes = require('./routes/user/help.routes');
mountRoute('/admin/help', helpRoutes);
mountRoute('/help', userHelpRoutes);

// ================= CONTENT =================

const movieRoutes = require("./routes/admin/movie.routes");
const seriesRoutes = require("./routes/admin/series.routes");
const episodeRoutes = require("./routes/admin/episode.routes");
mountRoute("/movies", movieRoutes);
mountRoute("/series", seriesRoutes);
mountRoute("/episodes", episodeRoutes);

// ================= USER CONTENT =================

const userContentRoutes = require("./routes/user/content.routes");
mountRoute("/content", userContentRoutes);

// ================= WATCHLIST =================

const watchlistRoutes = require("./routes/user/watchlist.routes");
mountRoute("/user/watchlist", watchlistRoutes);

// ================= SUBSCRIPTION =================

const subscriptionRoutes = require("./routes/user/subscription.routes");
mountRoute("/subscription", subscriptionRoutes);

// ================= PROMO =================
mountRoute("/promo", require("./routes/user/promo.routes"));

// ================= VOUCHER =================
mountRoute("/voucher", require("./routes/user/voucher.routes"));

// ================= ADMIN PROMO =================
mountRoute("/admin/promo", require("./routes/admin/promo.routes"));

// ================= ADMIN VOUCHER =================
mountRoute("/admin/voucher", require("./routes/admin/voucher.routes"));

// ================= INTERACTION =================

const interactionRoutes = require("./routes/user/interaction.routes");
mountRoute("/interaction", interactionRoutes);

// ================= RATING =================

mountRoute("/rating", require("./routes/user/rating.routes"));

// ================= PLANS =================

mountRoute("/admin/plans", require("./routes/admin/plan.routes"));
mountRoute("/plans", require("./routes/user/plan.routes"));

// ================= ADMIN SUBSCRIPTION =================

mountRoute("/admin/subscription", require("./routes/admin/subscription.routes"));

// ================= USER GROWTH =================

mountRoute("/admin/user", require("./routes/user/user.routes"));

// ================= CONTENT COUNT =================

mountRoute("/admin/content", require("./routes/admin/content.routes"));

const searchRoutes = require("./routes/admin/search.routes");

// app.use("/api/admin", searchRoutes); 
mountRoute("/admin", searchRoutes);

// ================= GLOBAL ERROR HANDLER =================

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ================= 404 HANDLER =================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});



// ================= EXPORT =================

module.exports = app;