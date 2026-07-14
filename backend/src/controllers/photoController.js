const Photo = require("../models/Photo");
const Event = require("../models/Event");
const FaceEmbedding = require("../models/FaceEmbedding");
const { uploadImageBuffer, deleteImage } = require("../services/storageService");
const { enqueueProcessPhoto } = require("../jobs/processPhotoJob");

/**
 * POST /api/events/:eventId/photos
 * Accepts multiple files (field name "photos") and uploads each one
 * to Cloudinary, then creates a Photo record for each.
 *
 * Uploads happen in parallel (Promise.allSettled) rather than one at
 * a time, since these are independent network calls to Cloudinary -
 * sequential uploads would make a 500-photo batch painfully slow.
 *
 * We use allSettled (not all) so that if 3 out of 500 photos fail
 * (corrupt file, network blip), the other 497 still succeed instead
 * of the whole batch being thrown away.
 */
async function uploadPhotos(req, res, next) {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, createdBy: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No photos were uploaded" });
    }

    const uploadResults = await Promise.allSettled(
      req.files.map(async (file) => {
        const uploaded = await uploadImageBuffer(file.buffer, eventId);
        const photo = await Photo.create({
          eventId,
          uploadedBy: req.userId,
          ...uploaded,
        });

        // Enqueued onto a sequential in-process queue rather than fired
        // immediately - see processPhotoJob.js for why. The upload
        // response still doesn't wait for this; it just guarantees
        // photos process one at a time in the background instead of
        // all at once.
        enqueueProcessPhoto(photo._id, file.buffer, file.originalname).catch((err) => {
          console.error(`Failed to process photo ${photo._id}:`, err.message);
        });

        return photo;
      })
    );

    const succeeded = uploadResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    const failedCount = uploadResults.filter((r) => r.status === "rejected").length;

    res.status(201).json({
      message: `Uploaded ${succeeded.length} of ${req.files.length} photos`,
      photos: succeeded,
      failedCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/events/:eventId/photos
 * Admin-facing photo list for an event (includes processingStatus,
 * unlike the guest-facing gallery which will only show matched photos).
 */
async function getPhotosByEvent(req, res, next) {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, createdBy: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });

    res.json({ photos });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/events/:eventId/photos/:photoId
 * Removes a photo from both Cloudinary and the database.
 */
async function deletePhoto(req, res, next) {
  try {
    const { eventId, photoId } = req.params;

    const event = await Event.findOne({ _id: eventId, createdBy: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const photo = await Photo.findOne({ _id: photoId, eventId });
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    await deleteImage(photo.cloudinaryId);
    await FaceEmbedding.deleteMany({ photoId: photo._id });
    await photo.deleteOne();

    res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadPhotos, getPhotosByEvent, deletePhoto };
