import axios from "axios";
// import { API_URL } from "/config/API_URL";

const BASE_URL = "https://allmall-in.onrender.com";

export const api = axios.create({
  baseURL: BASE_URL,
  // timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    console.error(
      "API Error response and message:",
      error.response || error.message
    );
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Please try again later or provide the correct email id."
      );
    }
    if (!error.response) {
      throw new Error("Network error: Could not connect to server");
    }
    console.error(
      "API Error response and message:",
      error.response || error.message
    );
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);
