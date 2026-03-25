const app=require('./app');
const connectDB = require('./config/db')
require('dotenv').config()

//connect to database
connectDB()
const port = process.env.PORT || 5000




app.listen(port , ()=> console.log('> Server is up and running on port : ' + port));