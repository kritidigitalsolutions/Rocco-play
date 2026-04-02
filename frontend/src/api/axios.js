import axios from "axios";

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  "http://localhost:5000/api";

const FALLBACK_API_BASE_URL =
  import.meta.env.VITE_API_FALLBACK_BASE_URL?.trim() ||
  "https://rocco-play-backend.vercel.app/api";

const toSafeBaseUrl = (value) => {
  const normalized = (value || "").replace(/\/+$/, "");

  try {
    const parsed = new URL(normalized);
    const blockedHosts = new Set(["dating-app-3apa.vercel.app"]);
    const isBlockedHost = blockedHosts.has(parsed.hostname);
    const isLocalhostInProd =
      window.location.hostname.endsWith("vercel.app") &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname);

    if (isBlockedHost || isLocalhostInProd) {
      return FALLBACK_API_BASE_URL.replace(/\/+$/, "");
    }
  } catch {
    // Keep normalized value if URL parsing fails.
  }

  return normalized;
};

const API_BASE_URL = toSafeBaseUrl(rawBaseUrl);

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ✅ Response interceptor for global error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
export { API_BASE_URL };
export default API;