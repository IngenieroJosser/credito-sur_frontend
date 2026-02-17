import axios from "axios";

export const apiClient = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001") + "/api-credisur",
  timeout: 15000,
});