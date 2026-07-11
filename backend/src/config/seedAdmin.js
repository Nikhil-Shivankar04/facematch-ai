/**
 * Run this once to create your admin account, since there is no
 * public signup form by design.
 *
 * Usage:
 *   node src/config/seedAdmin.js
 *
 * Edit the NAME, EMAIL, and PASSWORD constants below before running,
 * then delete or forget about this script - it's not part of the
 * running application.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const NAME = "Nikk";
const EMAIL = "nikk@example.com";
const PASSWORD = "changeme123"; // change this before running, and again after first login

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: EMAIL.toLowerCase() });
  if (existing) {
    console.log("Admin already exists with this email. No action taken.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await User.create({
    name: NAME,
    email: EMAIL.toLowerCase(),
    passwordHash,
  });

  console.log(`Admin account created for ${EMAIL}. You can now log in.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
