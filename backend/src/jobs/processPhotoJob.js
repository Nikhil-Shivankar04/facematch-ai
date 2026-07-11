const Photo = require("../models/Photo");
const FaceEmbedding = require("../models/FaceEmbedding");
const { detectFaces } = require("../services/aiClient");

/**
 * Processes a single photo: sends it to the AI service, stores every
 * detected face as a FaceEmbedding, and updates the photo's status.
 *
 * Deliberately NOT using a job queue (BullMQ/Redis) yet - this runs
 * as a fire-and-forget async function called right after upload.
 * That's a real limitation (if the server restarts mid-processing,
 * in-flight jobs are lost, and there's no automatic retry), but it
 * keeps setup to what we already have running rather than adding
 * Redis as a new dependency. See README for the documented upgrade
 * path once this needs to handle real production scale.
 */
async function processPhoto(photoId, imageBuffer, filename) {
  try {
    await Photo.findByIdAndUpdate(photoId, { processingStatus: "processing" });

    const result = await detectFaces(imageBuffer, filename);

    const photo = await Photo.findById(photoId);
    if (!photo) {
      // Photo was deleted while processing was in flight - nothing to do.
      return;
    }

    if (result.faces.length > 0) {
      const embeddingDocs = result.faces.map((face) => ({
        photoId: photo._id,
        eventId: photo.eventId,
        embedding: face.embedding,
        box: face.box,
      }));
      await FaceEmbedding.insertMany(embeddingDocs);
    }

    photo.processingStatus = "done";
    photo.isBlurry = result.isBlurry;
    photo.blurScore = result.blurScore;
    photo.faceCount = result.faceCount;
    await photo.save();
  } catch (error) {
    console.error(`Photo processing failed for ${photoId}:`, error.message);
    await Photo.findByIdAndUpdate(photoId, { processingStatus: "failed" }).catch(() => {});
  }
}

module.exports = { processPhoto };
