const mongoose = require("mongoose");

/**
 * User model represents the admin (you, the photographer).
 * There is intentionally no public signup for this role in v1 -
 * guests never create accounts, they interact anonymously via
 * event links. See project design notes for why.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
