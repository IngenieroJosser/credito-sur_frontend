import axios from "axios";

const rawBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://credito-sur-backend.onrender.com"
    : "http://localhost:3001");

const normalizedBase = rawBaseUrl.replace(/\/$/, "");
const apiBase = normalizedBase.endsWith("/api-credisur")
  ? normalizedBase
  : `${normalizedBase}/api-credisur`;

export const apiClient = axios.create({
  baseURL: `${apiBase}/`,
  timeout: 15000,
});
