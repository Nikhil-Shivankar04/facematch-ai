const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Event = require("../models/Event");
const Photo = require("../models/Photo");
const FaceEmbedding = require("../models/FaceEmbedding");
const { deleteImage } = require("../services/storageService");

/**
 * Generates a long, random, URL-safe slug for the guest link.
 * Deliberately not sequential/predictable (e.g. not "event-1",
 * "event-2") so guests can't enumerate other events by guessing.
 */
function generateShareSlug() {
  return crypto.randomBytes(12).toString("hex"); // 24-character slug
}

/**
 * POST /api/events
 * Creates a new event. Only accessible to the logged-in admin.
 */
async function createEvent(req, res, next) {
  try {
    const { title, eventDate, password, expiresAt } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ message: "Title and eventDate are required" });
    }

    const eventData = {
      title,
      eventDate,
      expiresAt: expiresAt || null,
      shareSlug: generateShareSlug(),
      createdBy: req.userId,
      status: "draft",
    };

    if (password) {
      eventData.passwordHash = await bcrypt.hash(password, 10);
    }

    const event = await Event.create(eventData);

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/events
 * Lists all events created by the logged-in admin, most recent first.
 */
async function getEvents(req, res, next) {
  try {
    const events = await Event.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .select("-passwordHash");

    res.json({ events });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/events/:id
 * Returns a single event's full details for the admin dashboard.
 */
async function getEventById(req, res, next) {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("-passwordHash");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/events/:id
 * Updates event details (title, date, status, expiry, password).
 */
async function updateEvent(req, res, next) {
  try {
    const { title, eventDate, status, expiresAt, password } = req.body;

    const event = await Event.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (title !== undefined) event.title = title;
    if (eventDate !== undefined) event.eventDate = eventDate;
    if (status !== undefined) event.status = status;
    if (expiresAt !== undefined) event.expiresAt = expiresAt;
    if (password) event.passwordHash = await bcrypt.hash(password, 10);

    await event.save();

    res.json({ event });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/events/:id
 * Deletes an event AND all of its photos, both from the database and
 * from Cloudinary - otherwise deleted events would leave orphaned
 * files sitting in storage forever, quietly costing money and never
 * getting cleaned up.
 */
async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.id, createdBy: req.userId });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const photos = await Photo.find({ eventId: event._id });

    // Delete from Cloudinary in parallel; allSettled so one failed
    // deletion doesn't stop the rest from being cleaned up.
    await Promise.allSettled(photos.map((photo) => deleteImage(photo.cloudinaryId)));

    await Photo.deleteMany({ eventId: event._id });
    await FaceEmbedding.deleteMany({ eventId: event._id });
    await event.deleteOne();

    res.json({ message: "Event and all associated photos deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
