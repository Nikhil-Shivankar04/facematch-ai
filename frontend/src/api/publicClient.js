import axios from "axios";

// Deliberately separate from the admin apiClient - guest requests
// should never carry the admin's JWT, even if the same browser
// happens to be logged in as admin in another tab.
const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 60000,
});

export default publicApiClient;
