const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// ✅ NOTE: dotenv.config() is called in api/index.js BEFORE this module is required
// Do NOT call it here — it would run before env vars are loaded in serverless context

const app = express();

const mountRoute = (path, router) => {
  app.use(path, router);
  app.use(`/api${path}`, router);
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

    const extraOrigins = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL, // ✅ Read at request time, not module load time
      ...extraOrigins,
    ].filter(Boolean);

    // Allow Vercel preview and production domains to reduce deployment friction.
    const isVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

    if (allowedOrigins.includes(origin) || isVercelOrigin) {
      return callback(null, true);
    }
    console.warn("⚠️ CORS blocked origin:", origin, "| Allowed:", allowedOrigins);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ================= GENERAL MIDDLEWARE =================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Request logging (skip in test env)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

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