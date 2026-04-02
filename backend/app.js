const express = require('express');

const app = express();

const cors = require('cors');

require("dotenv").config();

// ================= MIDDLEWARE =================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Serve uploaded files

app.use("/uploads", express.static("uploads"));

// ================= ROOT ROUTE =================

app.get("/", (req, res) => {

res.send("API is running 🚀");

});

// ================= ADMIN AUTH =================

const adminAuthRoutes = require('./routes/admin/auth.routes');

app.use('/admin/auth', adminAuthRoutes);

// ================= ADMIN CREATION =================

const bcrypt = require("bcryptjs");

const Admin = require("./models/admin.model");

const createAdmin = async () => {

const hashedPassword = await bcrypt.hash("123456", 10);

await Admin.create({

name: "Garima",

email: "agrawalgarima53@gmail.com",

password: hashedPassword

});

console.log("Admin created");

};

// Only run locally (NOT on Vercel)

if (process.env.NODE_ENV !== "production") {

createAdmin().catch(err =>

console.log("Admin exists or error:", err.message)

);

}

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

// ================= EXPORT =================

module.exports = app;