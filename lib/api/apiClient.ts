import axios from "axios";

const defaultBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://credito-sur-backend.onrender.com"
    : "http://localhost:3001/api-credisur";

const baseURL = (process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl).replace(
  /\/$/,
  ""
);

export const apiClient = axios.create({
  baseURL: `${baseURL}/`,
  timeout: 15000,
});
