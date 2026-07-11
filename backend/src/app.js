const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const photoRoutes = require("./routes/photoRoutes");
const publicRoutes = require("./routes/publicRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security headers on every response.
app.use(helmet());

// Only allow requests from our actual frontend, not any origin.
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// Simple health check - useful for confirming deployment worked
// and for uptime monitoring later.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events/:eventId/photos", photoRoutes);
app.use("/api/public/events", publicRoutes);

// Catch-all for unmatched routes.
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Must be registered last - Express identifies error handlers by
// their 4-argument signature (err, req, res, next).
app.use(errorHandler);

module.exports = app;
