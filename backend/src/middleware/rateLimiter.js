const rateLimit = require("express-rate-limit");

/**
 * Limits login attempts to slow down brute-force attacks.
 * 10 attempts per 15 minutes per IP is generous enough for a real
 * user who mistypes their password, but tight enough to block
 * automated guessing.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
