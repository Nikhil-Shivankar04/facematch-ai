const express = require("express");
const {
  uploadPhotos,
  getPhotosByEvent,
  deletePhoto,
} = require("../controllers/photoController");
const requireAuth = require("../middleware/auth");
const upload = require("../middleware/upload");

// mergeParams lets this router access :eventId from the parent
// route it gets mounted under in app.js.
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.post("/", upload.array("photos"), uploadPhotos);
router.get("/", getPhotosByEvent);
router.delete("/:photoId", deletePhoto);

module.exports = router;
