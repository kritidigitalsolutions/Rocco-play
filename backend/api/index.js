// ✅ Load env vars first in serverless context
require("dotenv").config();

const serverless = require("serverless-http");
const app = require("../app");
const connectDB = require("../config/db");

let isConnected = false;

const connectDatabase = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
    console.log("✅ DB Connected (serverless)");
  }
};

module.exports = async (req, res) => {
  await connectDatabase();
  return serverless(app)(req, res);
};