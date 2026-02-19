import axios from "axios";

// En producción (Vercel), si no hay variable de entorno, usar la URL de Render
const defaultBaseUrl = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://credito-sur-backend.onrender.com"
  : "http://localhost:3001";

export const apiClient = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl) + "/api-credisur/",
  timeout: 15000,
});