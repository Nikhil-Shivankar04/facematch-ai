/**
 * Centralized error handler. Any error passed to next(err) anywhere
 * in the app ends up here, so error responses stay consistent instead
 * of being formatted differently in every controller.
 */
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Multer throws its own error type for upload violations (file too
  // large, too many files, etc.) - translate it into a clean 400
  // instead of letting it fall through as a generic 500.
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong on the server";

  res.status(statusCode).json({
    message,
    // Only leak stack traces in development, never in production.
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

module.exports = errorHandler;
