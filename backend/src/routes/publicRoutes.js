const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getPublicEvent,
  verifyEventPassword,
  matchGuestSelfie,
  downloadMatchedZip,
} = require("../controllers/publicController");
const upload = require("../middleware/upload");

const router = express.Router({ mergeParams: true });

// The selfie-matching endpoint is our most expensive route (it runs
// face detection on every request) and the only one exposed to the
// public internet with no login required - so it gets its own,
// tighter rate limit to prevent abuse from driving up compute costs
// or being used to hammer the AI service.
const matchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:shareSlug", getPublicEvent);
router.post("/:shareSlug/verify-password", verifyEventPassword);
router.post("/:shareSlug/match", matchLimiter, upload.single("selfie"), matchGuestSelfie);
router.post("/:shareSlug/download-zip", downloadMatchedZip);

module.exports = router;
