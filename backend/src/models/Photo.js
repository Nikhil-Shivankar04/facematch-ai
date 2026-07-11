const mongoose = require("mongoose");

/**
 * Photo represents a single uploaded image belonging to an event.
 *
 * `processingStatus` tracks the face-detection pipeline that gets
 * wired in during Phase 3 - for now every photo is created as
 * "pending" and stays there until that pipeline exists. Building the
 * field now (rather than adding it later) avoids a schema migration
 * once Phase 3 lands.
 */
const photoSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    // Full-resolution image URL (Cloudinary secure_url).
    imageUrl: {
      type: String,
      required: true,
    },
    // Smaller, fast-loading version for gallery grids.
    thumbnailUrl: {
      type: String,
      required: true,
    },
    // Cloudinary's public_id - needed to delete the asset later.
    cloudinaryId: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
    },
    width: Number,
    height: Number,
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
      index: true,
    },
    // Set once AI processing completes - lets the guest gallery skip
    // showing blurry shots even if they happen to match a face.
    isBlurry: {
      type: Boolean,
      default: false,
    },
    blurScore: {
      type: Number,
      default: null,
    },
    faceCount: {
      type: Number,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Photo", photoSchema);
