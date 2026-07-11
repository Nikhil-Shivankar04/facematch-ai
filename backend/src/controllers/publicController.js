const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const archiver = require("archiver");
const Event = require("../models/Event");
const Photo = require("../models/Photo");
const FaceEmbedding = require("../models/FaceEmbedding");
const { matchSelfie } = require("../services/aiClient");

/**
 * Guests never get a real user account or the admin JWT - instead,
 * for password-protected events, we issue a short-lived, event-scoped
 * token after a correct password. This keeps the password check
 * separate from the (potentially expensive) selfie-matching request,
 * so a guest doesn't have to re-enter the password on every retry.
 */
function generateGuestToken(eventId) {
  return jwt.sign({ eventId, scope: "guest" }, process.env.JWT_SECRET, {
    expiresIn: "6h",
  });
}

function isEventAccessible(event) {
  if (!event) return false;
  if (event.status === "archived") return false;
  if (event.expiresAt && new Date(event.expiresAt) < new Date()) return false;
  return true;
}

/**
 * GET /api/public/events/:shareSlug
 * Returns just enough info for the guest landing page to render -
 * never the admin-only fields (createdBy, passwordHash, etc.).
 */
async function getPublicEvent(req, res, next) {
  try {
    const event = await Event.findOne({ shareSlug: req.params.shareSlug });

    if (!isEventAccessible(event)) {
      return res.status(404).json({ message: "This event link is no longer available." });
    }

    const photoCount = await Photo.countDocuments({
      eventId: event._id,
      processingStatus: "done",
    });

    res.json({
      event: {
        title: event.title,
        eventDate: event.eventDate,
        coverImageUrl: event.coverImageUrl,
        requiresPassword: !!event.passwordHash,
        photoCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/public/events/:shareSlug/verify-password
 * Checks the guest-supplied password and, if correct, issues a
 * short-lived guest token scoped to this one event only.
 */
async function verifyEventPassword(req, res, next) {
  try {
    const { password } = req.body;
    const event = await Event.findOne({ shareSlug: req.params.shareSlug });

    if (!isEventAccessible(event)) {
      return res.status(404).json({ message: "This event link is no longer available." });
    }

    if (!event.passwordHash) {
      // No password set - nothing to verify, just hand back a token
      // so the frontend flow stays consistent either way.
      return res.json({ guestToken: generateGuestToken(event._id) });
    }

    const isMatch = await bcrypt.compare(password || "", event.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    res.json({ guestToken: generateGuestToken(event._id) });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/public/events/:shareSlug/match
 * The core guest experience: takes a selfie, compares it against
 * every face detected in this event's photos, returns only the
 * photos that matched and have finished processing.
 */
async function matchGuestSelfie(req, res, next) {
  try {
    const event = await Event.findOne({ shareSlug: req.params.shareSlug });

    if (!isEventAccessible(event)) {
      return res.status(404).json({ message: "This event link is no longer available." });
    }

    if (event.passwordHash) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

      if (!token) {
        return res.status(401).json({ message: "Password required." });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.scope !== "guest" || decoded.eventId !== String(event._id)) {
          throw new Error("Token does not match this event");
        }
      } catch {
        return res.status(401).json({ message: "Your session expired. Please enter the password again." });
      }
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please provide a selfie." });
    }

    const embeddings = await FaceEmbedding.find({ eventId: event._id }).select(
      "photoId embedding"
    );

    const candidates = embeddings.map((e) => ({
      photoId: String(e.photoId),
      embedding: e.embedding,
    }));

    const { matchedPhotoIds } = await matchSelfie(req.file.buffer, req.file.originalname, candidates);

    if (matchedPhotoIds.length === 0) {
      return res.json({ photos: [] });
    }

    // Re-fetch as Photo documents. NOTE: we deliberately do NOT filter
    // on isBlurry here - our current blur-detection threshold turned
    // out to be miscalibrated for portrait photos (smooth skin and
    // bokeh backgrounds naturally score "low variance" even when
    // perfectly in focus, so it was hiding genuinely sharp matches).
    // Hiding a real match is worse for guests than occasionally
    // showing a soft photo, so we only filter on processingStatus
    // here until blur detection is properly tuned against real data.
    const photos = await Photo.find({
      _id: { $in: matchedPhotoIds },
      eventId: event._id,
      processingStatus: "done",
    }).select("imageUrl thumbnailUrl");

    res.json({ photos });
  } catch (error) {
    if (error.response?.status === 422) {
      // The AI service returns 422 specifically when no face was found
      // in the selfie - surface that as a clear, actionable message
      // rather than a generic 500.
      return res.status(422).json({
        message: error.response.data?.detail || "No face detected in the selfie. Try again with better lighting.",
      });
    }
    next(error);
  }
}

/**
 * POST /api/public/events/:shareSlug/download-zip
 * Bundles the guest's matched photos into a single ZIP for one-tap
 * download, rather than making them save each photo individually.
 *
 * We re-verify that every requested photoId actually belongs to this
 * event and is done processing - the frontend sends back the IDs it
 * already displayed, but we never trust that blindly, since a guest
 * could tamper with the request to try pulling in other photos.
 *
 * Streams the ZIP directly to the response as each image downloads
 * from Cloudinary, rather than buffering the whole archive in memory
 * first - this keeps memory usage flat regardless of how many or how
 * large the photos are.
 */
async function downloadMatchedZip(req, res, next) {
  try {
    const event = await Event.findOne({ shareSlug: req.params.shareSlug });

    if (!isEventAccessible(event)) {
      return res.status(404).json({ message: "This event link is no longer available." });
    }

    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ message: "No photos specified." });
    }

    const photos = await Photo.find({
      _id: { $in: photoIds },
      eventId: event._id,
      processingStatus: "done",
    }).select("imageUrl");

    if (photos.length === 0) {
      return res.status(404).json({ message: "No matching photos found." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${event.shareSlug}-photos.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("ZIP archive error:", err.message);
      // Headers are likely already sent by this point, so we can't
      // send a JSON error response - just end the stream.
      res.end();
    });
    archive.pipe(res);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const response = await axios.get(photo.imageUrl, { responseType: "stream" });
        // Numbered filenames since original filenames aren't stored,
        // and guests generally just want "all my photos," not
        // preserved original names.
        archive.append(response.data, { name: `photo-${i + 1}.jpg` });
      } catch (err) {
        console.error(`Failed to fetch photo ${photo._id} for ZIP:`, err.message);
        // Skip this one photo rather than failing the entire download -
        // a guest getting 9 out of 10 photos is much better than
        // getting a failed download with zero.
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
}

module.exports = { getPublicEvent, verifyEventPassword, matchGuestSelfie, downloadMatchedZip };
