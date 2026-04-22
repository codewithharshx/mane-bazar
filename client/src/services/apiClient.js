import axios from "axios";

const STORAGE_KEY = "mane-bazar-auth";
const TOKEN_KEY = "token";
const DEFAULT_API_URL = "http://localhost:5000/api";
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

export const getStoredAuth = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const token = parsed.accessToken || localStorage.getItem(TOKEN_KEY) || "";
    return {
      ...parsed,
      accessToken: token
    };
  } catch (error) {
    return { accessToken: localStorage.getItem(TOKEN_KEY) || "" };
  }
};

export const saveStoredAuth = (payload) => {
  const normalized = payload || {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

  if (normalized.accessToken) {
    localStorage.setItem(TOKEN_KEY, normalized.accessToken);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const { accessToken } = getStoredAuth();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const current = getStoredAuth();
        saveStoredAuth({ ...current, accessToken: data.accessToken, user: data.user });
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredAuth();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
