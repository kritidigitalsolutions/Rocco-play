require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/user.model");

const testUsers = [
  // Master dummy test account
  {
    phone: "+919999999999",
    name: "HDFC Master Test User",
    email: "hdfctest@roccoplay.com",
    role: "USER",
    profileComplete: true,
    isBlocked: false,
    authProvider: "PHONE",
  },
  // 15 Test accounts for HDFC Bank testing & security audit
  ...Array.from({ length: 15 }, (_, i) => {
    const numStr = String(i + 1).padStart(2, "0");
    return {
      phone: `+9199999000${numStr}`,
      name: `HDFC Test User ${i + 1}`,
      email: `hdfctest${i + 1}@roccoplay.com`,
      role: "USER",
      profileComplete: true,
      isBlocked: false,
      authProvider: "PHONE",
    };
  }),
];

async function seedTestUsers() {
  try {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    console.log(`\nSeeding ${testUsers.length} test accounts...`);

    for (const userData of testUsers) {
      const result = await User.findOneAndUpdate(
        { phone: userData.phone },
        {
          $set: {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            profileComplete: userData.profileComplete,
            isBlocked: userData.isBlocked,
            authProvider: userData.authProvider,
          },
          $setOnInsert: {
            phone: userData.phone,
          },
        },
        { upsert: true, new: true }
      );
      console.log(`✅ [${userData.phone}] - ${userData.name} (${userData.email}) -> ID: ${result._id}`);
    }

    console.log(`\n🎉 Successfully seeded/updated all ${testUsers.length} test accounts!`);
    console.log("Static OTP for all test accounts: 123456\n");
  } catch (error) {
    console.error("❌ Error seeding test users:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

seedTestUsers();
