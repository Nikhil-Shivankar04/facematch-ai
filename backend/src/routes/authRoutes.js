const express = require("express");
const { login, getMe } = require("../controllers/authController");
const requireAuth = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, getMe);

module.exports = router;
