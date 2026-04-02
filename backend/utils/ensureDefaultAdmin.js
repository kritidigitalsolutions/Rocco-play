const bcrypt = require("bcryptjs");
const Admin = require("../models/admin.model");

let hasEnsuredInProcess = false;

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const ensureDefaultAdmin = async () => {
  if (hasEnsuredInProcess) {
    return;
  }

  const adminEmail = normalizeEmail(process.env.DEFAULT_ADMIN_EMAIL || "");
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "";

  // Skip auto-seeding if default admin credentials are not configured.
  if (!adminEmail || !adminPassword) {
    hasEnsuredInProcess = true;
    return;
  }

  const existingAdmin = await Admin.findOne({ email: adminEmail }).select("_id");
  if (existingAdmin) {
    hasEnsuredInProcess = true;
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await Admin.create({
    name: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
  });

  hasEnsuredInProcess = true;
  console.log("Default admin created");
};

module.exports = ensureDefaultAdmin;
