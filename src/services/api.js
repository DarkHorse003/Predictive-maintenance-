import axios from "axios";

export const DEFAULT_API_BASE_URL = "https://trusting-said-pulsate.ngrok-free.dev";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
