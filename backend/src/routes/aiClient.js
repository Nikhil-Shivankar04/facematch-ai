const axios = require("axios");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

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
  const formData = new FormData();
  formData.append("photo", imageBuffer, filename);

  const { data } = await axios.post(`${AI_SERVICE_URL}/detect-faces`, formData, {
    headers: formData.getHeaders(),
    // Free-tier hosting (e.g. Render) spins down the AI service after
    // inactivity - waking it back up can itself take 50+ seconds,
    // on top of actual processing time. 90s gives real headroom for
    // a cold start plus a large photo, rather than failing on the
    // wake-up delay alone.
    timeout: 90000,
  });

  return data;
}

/**
 * Sends a guest's selfie plus a list of candidate face embeddings for
 * an event, gets back which photoIds matched. Used in Phase 4 (guest
 * matching flow) - included now since the AI service already exposes
 * this endpoint.
 */
async function matchSelfie(selfieBuffer, filename, candidates) {
  const formData = new FormData();
  formData.append("selfie", selfieBuffer, filename);
  formData.append("candidates", JSON.stringify(candidates));

  const { data } = await axios.post(`${AI_SERVICE_URL}/match-selfie`, formData, {
    headers: formData.getHeaders(),
    timeout: 90000,
  });

  return data;
}

module.exports = { detectFaces, matchSelfie };
