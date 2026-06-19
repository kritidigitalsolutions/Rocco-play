const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const SupportMessage = require("../models/supportMessage.model");

const run = async () => {
  console.log("====================================================");
  console.log("🚀 Starting Support Message Attachments Migration");
  console.log("====================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    // Update all support messages that do not have the attachments field
    const result = await SupportMessage.updateMany(
      { attachments: { $exists: false } },
      { $set: { attachments: [] } }
    );

    console.log(`✅ Migration complete.`);
    console.log(`- Matched documents: ${result.matchedCount}`);
    console.log(`- Modified documents: ${result.modifiedCount}`);

    await mongoose.connection.close();
    console.log("\nClosed MongoDB connection. Done!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

run();
