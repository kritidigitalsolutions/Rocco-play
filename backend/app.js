const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// ✅ Load env FIRST before anything else uses process.env
require("dotenv").config();

const app = express();

// ================= SECURITY MIDDLEWARE =================

// ✅ Helmet for security headers
app.use(helmet());

// ✅ CORS - locked down to allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Set this in Vercel env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
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
app.use('/admin/auth', adminAuthRoutes);

// ================= USER ROUTES =================

const userAuthRoutes = require('./routes/user/auth.routes');
const userProfileRoutes = require('./routes/user/user.routes');
app.use('/user', userProfileRoutes);
app.use('/user/auth', userAuthRoutes);

// ================= LEGAL =================

const legalRoutes = require('./routes/admin/legal.routes');
const userLegalRoutes = require('./routes/user/legal.routes');
app.use('/admin/legal', legalRoutes);
app.use('/user/legal', userLegalRoutes);

// ================= HELP =================

const helpRoutes = require('./routes/admin/help.routes');
const userHelpRoutes = require('./routes/user/help.routes');
app.use('/admin/help', helpRoutes);
app.use('/help', userHelpRoutes);

// ================= CONTENT =================

const movieRoutes = require("./routes/admin/movie.routes");
const seriesRoutes = require("./routes/admin/series.routes");
const episodeRoutes = require("./routes/admin/episode.routes");
app.use("/movies", movieRoutes);
app.use("/series", seriesRoutes);
app.use("/episodes", episodeRoutes);

// ================= USER CONTENT =================

const userContentRoutes = require("./routes/user/content.routes");
app.use("/content", userContentRoutes);

// ================= WATCHLIST =================

const watchlistRoutes = require("./routes/user/watchlist.routes");
app.use("/user/watchlist", watchlistRoutes);

// ================= SUBSCRIPTION =================

const subscriptionRoutes = require("./routes/user/subscription.routes");
app.use("/subscription", subscriptionRoutes);

// ================= INTERACTION =================

const interactionRoutes = require("./routes/user/interaction.routes");
app.use("/interaction", interactionRoutes);

// ================= RATING =================

app.use("/rating", require("./routes/user/rating.routes"));

// ================= PLANS =================

app.use("/admin/plans", require("./routes/admin/plan.routes"));
app.use("/plans", require("./routes/user/plan.routes"));

// ================= ADMIN SUBSCRIPTION =================

app.use("/admin/subscription", require("./routes/admin/subscription.routes"));

// ================= USER GROWTH =================

app.use("/admin/user", require("./routes/user/user.routes"));

// ================= CONTENT COUNT =================

app.use("/admin/content", require("./routes/admin/content.routes"));

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