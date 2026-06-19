const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const createDefaultAdmin = require("./utils/createDefaultAdmin");

require("dotenv").config();

const app = express();

// Connect Database and Create Admin (for Serverless/Vercel)
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  connectDB().then(() => {
    createDefaultAdmin();
  });
}

// ========================================
// MIDDLEWARES
// ========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
  : [];
const adminUrls = process.env.ADMIN_URL
  ? process.env.ADMIN_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
  : [];

const defaultAllowed = [
process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://roccoplay-admin-panel.vercel.app",
  "https://roccoplay-sigma.vercel.app"
];

const allowedOrigins = [...new Set([...frontendUrls, ...adminUrls, ...defaultAllowed])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check exact matches or wildcard
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Dynamic pattern matching for development / Vercel preview environments
    const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
    const isRoccoPlayDomain = origin.endsWith(".vercel.app") && (origin.includes("roccoplay") || origin.includes("sigma"));

    if (isLocalhost || isRoccoPlayDomain) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);





// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.send(
    "Rocco play Backend Running 🚀"
  );
});


// ========================================
// ADMIN ROUTES
// ========================================
const adminAuthRoutes = require(
  "./routes/admin/auth.routes"
);

const adminUserRoutes = require(
  "./routes/admin/user.routes"
);

const movieRoutes = require(
  "./routes/admin/movie.routes"
);

const seriesRoutes = require(
  "./routes/admin/series.routes"
);

const episodeRoutes = require(
  "./routes/admin/episode.routes"
);


const movieUserRoutes = require("./routes/user/movie.routes");
const seriesUserRoutes = require("./routes/user/series.routes");
const contentAdminRoutes = require("./routes/admin/content.routes");
const contentUserRoutes = require("./routes/user/content.routes");

const shortDramaRoutes = require(
  "./routes/admin/shortdrama.routes"
);

const dramaEpisodeRoutes = require(
  "./routes/admin/dramaEpisode.routes"
);
const dramaUserRoutes = require(
  "./routes/user/shortdrama.routes"
);
const dramaEpisodeUserRoutes = require(
  "./routes/user/dramaEpisode.routes"
);

const updateUpcomingStatus = require("./middlewares/updateUpcomingStatus.middleware");

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

app.use(
  "/api/admin/users",
  adminUserRoutes
);

app.use(
  "/api/admin/user",
  adminUserRoutes
);

app.use(
  "/api/admin/movies",
  updateUpcomingStatus,
  movieRoutes
);

app.use(
  "/api/admin/series",
  updateUpcomingStatus,
  seriesRoutes
);

app.use(
  "/api/admin/episodes",
  episodeRoutes
);

app.use(
  "/api/admin/content",
  updateUpcomingStatus,
  contentAdminRoutes
);


app.use(
  "/api/admin/shortdramas",
  shortDramaRoutes
);

app.use(
  "/api/admin/drama-episodes",
  dramaEpisodeRoutes
);

app.use(
  "/api/shortdramas",
  dramaUserRoutes
);

app.use(
  "/api/drama-episodes",
  dramaEpisodeUserRoutes
);


// ========================================
// USER ROUTES
// ========================================
const authRoutes = require(
  "./routes/user/auth.routes"
);

const userRoutes = require(
  "./routes/user/user.routes"
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use("/api/movies", updateUpcomingStatus, movieUserRoutes);

app.use("/api/series", updateUpcomingStatus, seriesUserRoutes);

app.use("/api/content", updateUpcomingStatus, contentUserRoutes);

//legal routes for admin
const adminLegal = require("./routes/admin/legal.routes");
app.use("/api/admin/legal", adminLegal);

//legal routes for user
const userLegal = require("./routes/user/legal.routes");
app.use("/api/legal", userLegal);


//help routes
const helpAdminRoutes = require("./routes/admin/help.routes");
const helpUserRoutes = require("./routes/user/help.routes");

app.use("/api/admin/help", helpAdminRoutes);
app.use("/api/help", helpUserRoutes);

//rating routes
const ratingRoutes = require("./routes/user/rating.routes");
app.use("/api/rating", ratingRoutes);

//plan routes
const adminPlanRoutes = require("./routes/admin/plan.routes");
const userPlanRoutes = require("./routes/user/plan.routes");

app.use("/api/admin/plan", adminPlanRoutes);
app.use("/api/plan", userPlanRoutes);

//promo routes
const adminPromoRoutes = require("./routes/admin/promo.routes");
app.use("/api/admin/promo", adminPromoRoutes);
const userPromoRoutes = require("./routes/user/promo.routes");
app.use("/api/promo", userPromoRoutes);

//voucher routes for admin
const adminVoucherRoutes = require("./routes/admin/voucher.routes");
app.use("/api/admin/voucher", adminVoucherRoutes);

//voucher routes for user
const userVoucherRoutes = require("./routes/user/voucher.routes");
app.use("/api/voucher", userVoucherRoutes);

//subscription routes
const adminSubscriptionRoutes = require("./routes/admin/subscription.routes");
const userSubscriptionRoutes = require("./routes/user/subscription.routes");

app.use("/api/admin/subscription", adminSubscriptionRoutes);
app.use("/api/subscription", userSubscriptionRoutes);

//watchlist routes
const watchlistRoutes = require("./routes/user/watchlist.routes");
app.use("/api/watchlist", watchlistRoutes);

//notification routes
const adminNotificationRoutes = require("./routes/admin/notification.routes");
const userNotificationRoutes = require("./routes/user/notification.routes");
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/notifications", userNotificationRoutes);

//interactions routes
const interactionRoutes = require("./routes/user/interation.routes");
app.use("/api/interaction", interactionRoutes);

// ================Razor Pay===============
// const paymentRoutes = require("./routes/user/payment.routes");
// app.use("/api/payment", paymentRoutes);

// SUPPORT ROUTES
const userSupportRoutes = require(
  "./routes/user/support.routes"
);

const adminSupportRoutes = require(
  "./routes/admin/support.routes"
);

app.use(
  "/api/support",
  userSupportRoutes
);

app.use(
  "/api/admin/support",
  adminSupportRoutes
);
// ========================================
// EXPORT
// ========================================
module.exports = app;
