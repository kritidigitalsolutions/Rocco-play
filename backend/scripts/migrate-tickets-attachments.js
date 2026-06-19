const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const SupportTicket = require("../models/supportTicket.model");
const SupportMessage = require("../models/supportMessage.model");

const run = async () => {
  console.log("====================================================");
  console.log("🚀 Syncing Support Ticket Attachments from Messages");
  console.log("====================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const tickets = await SupportTicket.find({});
    console.log(`Found ${tickets.length} tickets to process.`);

    let updatedCount = 0;

    for (const ticket of tickets) {
      // Find all messages for this ticket that have attachments
      const messages = await SupportMessage.find({
        ticket: ticket._id,
        attachments: { $exists: true, $not: { $size: 0 } }
      });

      if (messages.length > 0) {
        // Collect all attachments
        const allAttachments = [];
        messages.forEach(msg => {
          if (Array.isArray(msg.attachments)) {
            msg.attachments.forEach(url => {
              if (url && !allAttachments.includes(url)) {
                allAttachments.push(url);
              }
            });
          }
        });

        if (allAttachments.length > 0) {
          ticket.attachments = allAttachments;
          await ticket.save();
          updatedCount++;
          console.log(`Sync'd ${allAttachments.length} attachments to Ticket: ${ticket.subject} (ID: ${ticket._id})`);
        }
      }
    }

    console.log(`\n✅ Sync complete. Updated ${updatedCount} tickets.`);
    await mongoose.connection.close();
    console.log("Closed MongoDB connection. Done!");
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
};

run();
