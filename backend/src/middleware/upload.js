const multer = require("multer");

/**
 * We store uploads in memory (not on disk) since they get streamed
 * straight to Cloudinary - the server never needs to persist the
 * file itself. This keeps the API server stateless, which matters
 * once we run multiple instances behind a load balancer later.
 */
const storage = multer.memoryStorage();


const maxSizeBytes = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 15) * 1024 * 1024;
const maxFiles = Number(process.env.MAX_FILES_PER_UPLOAD) || 50;
function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

  const hasAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const hasAllowedExtension = allowedExtensions.some((ext) =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (hasAllowedMimeType || hasAllowedExtension) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, and HEIC images are allowed"), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeBytes,
    files: maxFiles,
  },
});

module.exports = upload;
