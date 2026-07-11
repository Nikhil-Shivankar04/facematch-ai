const mongoose = require("mongoose");

/**
 * FaceEmbedding stores one detected face from one photo. A single
 * photo can produce multiple FaceEmbedding documents (one per person
 * in the shot) - that's why this is its own collection rather than
 * an array field on Photo.
 *
 * `eventId` is duplicated here (not just reachable via photoId) so
 * that guest matching queries can filter directly by event without
 * an extra join - this is the index that keeps matching fast even
 * as total embeddings across all events grows, per our DB design.
 */
const faceEmbeddingSchema = new mongoose.Schema(
  {
    photoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    // 128-dimension face vector from the AI service.
    embedding: {
      type: [Number],
      required: true,
    },
    box: {
      top: Number,
      right: Number,
      bottom: Number,
      left: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaceEmbedding", faceEmbeddingSchema);
