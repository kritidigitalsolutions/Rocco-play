const express = require('express');
const app = express();
const cors = require('cors');

//middlewares
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());

//import routes
const adminAuthRoutes=require('./routes/admin/auth.routes');
//use routes
app.use('/api/admin/auth',adminAuthRoutes);


const bcrypt = require("bcryptjs");
const Admin = require("./models/admin.model");
const createAdmin = async () => {
  
 const hashedPassword = await bcrypt.hash("admin12345", 10);
  await Admin.create({
    name: "Super Admin",
    email: "admin@12345.com",
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
const movieRoutes = require("./routes/admin/movie.routes.js");

app.use("/api/movies", movieRoutes);

//watchlist routes
const watchlistRoutes = require("./routes/user/watchlist.routes");

app.use("/api/user/watchlist", watchlistRoutes);

module.exports = app;