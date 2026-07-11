const mongoose = require("mongoose");

/**
 * Event represents a single photography event (wedding, birthday, etc.)
 * created by the admin. Guests access it via the unique `shareSlug`,
 * never by its database _id, so the id itself is never exposed publicly.
 */
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    coverImageUrl: {
      type: String,
      default: null,
    },
    // Long, random, non-guessable slug used in the public guest link.
    // Generated server-side on creation - never sequential/predictable.
    shareSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Optional password to access the guest gallery. Hashed like any
    // other credential - never stored in plain text.
    passwordHash: {
      type: String,
      default: null,
    },
    // After this date, the guest link stops working even if someone
    // still has it. Supports the "event expiry" feature from our design.
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
