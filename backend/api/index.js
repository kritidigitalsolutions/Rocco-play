const serverless = require("serverless-http");
const app = require("../app");
const connectDB = require("../config/db");

let isConnected = false;

const connectDatabase = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
    console.log("✅ DB Connected");
  }
};

module.exports = async (req, res) => {
  await connectDatabase();
  return serverless(app)(req, res);
};