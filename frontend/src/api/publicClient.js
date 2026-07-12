import axios from "axios";

// Deliberately separate from the admin apiClient - guest requests
// should never carry the admin's JWT, even if the same browser
// happens to be logged in as admin in another tab.
const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Must exceed the backend's own AI-service timeout (90s) - otherwise
  // the frontend could give up and show an error even though the
  // backend request was still legitimately in progress (e.g. waiting
  // on a cold-started AI service to wake up).
  timeout: 100000,
});

export default publicApiClient;
