import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach the stored token to every outgoing request automatically,
// so individual components never have to think about auth headers.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("nikk_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says our token is invalid/expired, clear it and
// bounce to login - otherwise the app would sit in a broken half-logged-in
// state showing confusing errors everywhere.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("nikk_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
