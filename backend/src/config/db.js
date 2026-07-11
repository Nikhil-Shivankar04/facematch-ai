const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI from environment variables.
 * We fail fast (exit process) if the connection fails, because
 * there is no point running the API without a working database.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
