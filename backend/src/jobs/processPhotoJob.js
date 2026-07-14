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

// A simple in-process sequential queue, chained off a single promise.
// Without this, uploading several photos at once fires off that many
// simultaneous requests to the AI service - fine on a beefy host, but
// on a memory-constrained free-tier instance, concurrent face
// detection requests compound peak memory usage and make crashes
// more likely right when a real batch upload happens. Chaining every
// job onto this promise means each one fully finishes (success or
// failure) before the next one starts, regardless of how many
// uploads triggered around the same time.
let queue = Promise.resolve();

function enqueueProcessPhoto(photoId, imageBuffer, filename) {
  queue = queue
    .then(() => processPhoto(photoId, imageBuffer, filename))
    .catch(() => {
      // processPhoto already handles/logs its own errors internally;
      // this catch exists purely so one failed job can't break the
      // chain and silently stop every job queued after it.
    });
  return queue;
}

module.exports = { processPhoto, enqueueProcessPhoto };
