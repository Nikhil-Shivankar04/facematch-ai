const axios = require("axios");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an AI-service call with automatic retries.
 *
 * On free-tier hosting (e.g. Render), a fully-idle service doesn't just
 * respond slowly when it wakes up - the very first request often gets
 * an immediate 502 from the platform's proxy because the app hasn't
 * finished booting yet, before our own request timeout ever comes into
 * play. A longer timeout alone doesn't fix that; the request needs to
 * be retried a little later, once the service has actually started.
 *
 * Only retries on errors that look like "service not ready yet"
 * (502/503/504/connection failure) - a real 4xx from a properly
 * running service (e.g. bad input) fails immediately, since retrying
 * that would just waste time on an error that will never succeed.
 */
async function withRetry(requestFn, { retries = 5, delayMs = 15000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isRetryable =
        !error.response || // no response at all = connection-level failure
        status === 502 ||
        status === 503 ||
        status === 504;

      const isLastAttempt = attempt === retries;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      console.warn(
        `AI service call failed (attempt ${attempt + 1}/${retries + 1}, status ${status || "no response"}) - likely a cold start. Retrying in ${delayMs / 1000}s...`
      );
      await wait(delayMs);
    }
  }

  throw lastError;
}

/**
 * Sends a photo to the AI service for face detection + blur scoring.
 * Returns { faceCount, faces, blurScore, isBlurry }.
 *
 * This is the ONLY place in the Node app that talks to the AI
 * service directly - keeping it isolated here means the rest of the
 * app doesn't need to know or care that this is a separate Python
 * process, and it's easy to point at a different URL (e.g. a
 * deployed AI service) via one env variable.
 */
async function detectFaces(imageBuffer, filename) {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append("photo", imageBuffer, filename);

    const { data } = await axios.post(`${AI_SERVICE_URL}/detect-faces`, formData, {
      headers: formData.getHeaders(),
      // Free-tier hosting spins the AI service down after inactivity;
      // waking it back up can itself take 50+ seconds, on top of
      // actual processing time. 90s gives real headroom for a cold
      // start plus a large photo, rather than failing on the wake-up
      // delay alone.
      timeout: 90000,
    });

    return data;
  });
}

/**
 * Sends a guest's selfie plus a list of candidate face embeddings for
 * an event, gets back which photoIds matched.
 */
async function matchSelfie(selfieBuffer, filename, candidates) {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append("selfie", selfieBuffer, filename);
    formData.append("candidates", JSON.stringify(candidates));

    const { data } = await axios.post(`${AI_SERVICE_URL}/match-selfie`, formData, {
      headers: formData.getHeaders(),
      timeout: 90000,
    });

    return data;
  });
}

module.exports = { detectFaces, matchSelfie };
