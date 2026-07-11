const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Every event management route requires the admin to be logged in.
router.use(requireAuth);

router.post("/", createEvent);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.patch("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
