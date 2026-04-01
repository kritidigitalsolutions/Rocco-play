const express = require('express');
const app = express();
const cors = require('cors');
require("dotenv").config();

//middlewares
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

//import routes
const adminAuthRoutes=require('./routes/admin/auth.routes');
//use routes
app.use('/api/admin/auth',adminAuthRoutes);


const bcrypt = require("bcryptjs");
const Admin = require("./models/admin.model");
const createAdmin = async () => {
  
//  const hashedPassword = await bcrypt.hash("admin12345", 10);
//   await Admin.create({
//     name: "Super Admin",
//     email: "admin@12345.com",
//     password: hashedPassword
//   });
 const hashedPassword = await bcrypt.hash("123456", 10);
  await Admin.create({
    name: "Garima",
    email: "agrawalgarima53@gmail.com",
    password: hashedPassword
  });
 

  console.log("Admin created");
};
createAdmin().catch(err => console.log("Admin already exists or error:", err.message));
const userAuthRoutes = require('./routes/user/auth.routes');
const userProfileRoutes = require('./routes/user/user.routes');

//use user profile routes
app.use('/api/user', userProfileRoutes);

//use user auth routes
app.use('/api/user/auth', userAuthRoutes);

//legal document routes
const legalRoutes = require('./routes/admin/legal.routes');
app.use('/api/admin/legal', legalRoutes);

//user legal routes
const userLegalRoutes = require('./routes/user/legal.routes');
app.use('/api/user/legal', userLegalRoutes);

//help routes
const helpRoutes = require('./routes/admin/help.routes');
app.use('/api/admin/help', helpRoutes);

//user help routes
const userHelpRoutes = require('./routes/user/help.routes');
app.use('/api/help', userHelpRoutes);

//content routes
// const movieRoutes = require("./routes/admin/movie.routes.js");

// app.use("/api/movies", movieRoutes);
const movieRoutes = require("./routes/admin/movie.routes");
const seriesRoutes = require("./routes/admin/series.routes");
const episodeRoutes = require("./routes/admin/episode.routes");

app.use("/api/movies", movieRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/episodes", episodeRoutes);

//user content routes
const userContentRoutes = require("./routes/user/content.routes");

app.use("/api/content", userContentRoutes);
//watchlist routes
const watchlistRoutes = require("./routes/user/watchlist.routes");

app.use("/api/user/watchlist", watchlistRoutes);

const subscriptionRoutes = require("./routes/user/subscription.routes");

app.use("/api/subscription", subscriptionRoutes);

const interactionRoutes = require("./routes/user/interaction.routes");

app.use("/api/interaction", interactionRoutes);

app.use("/api/rating", require("./routes/user/rating.routes"));

// ADMIN ROUTES
app.use("/api/admin/plans", require("./routes/admin/plan.routes"));

// USER ROUTES
app.use("/api/plans", require("./routes/user/plan.routes"));

//get total revenue
app.use("/api/admin/subscription", require("./routes/admin/subscription.routes"));


//user growth chart
app.use("/api/admin/user", require("./routes/user/user.routes"));

//content split=count content 
app.use("/api/admin/content", require("./routes/admin/content.routes"));
module.exports = app;