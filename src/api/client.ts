import axios, { create } from 'axios';
import { API_BASE_URL } from '@/constants';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  saveAccessToken,
  saveRefreshToken,
} from '@/utils/secureStorage';

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshRequest: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const excludedPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      excludedPaths.some((path) => request.url?.includes(path))
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    if (!refreshRequest) {
      refreshRequest = (async () => {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearTokens();
          await notifySessionExpired();
          return null;
        }

        try {
          const response = await axios.post<{
            accessToken: string;
            refreshToken: string;
          }>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { timeout: 10000 },
          );
          await saveAccessToken(response.data.accessToken);
          await saveRefreshToken(response.data.refreshToken);
          return response.data.accessToken;
        } catch {
          await clearTokens();
          await notifySessionExpired();
          return null;
        }
      })().finally(() => {
        refreshRequest = null;
      });
    }

    const accessToken = await refreshRequest;
    if (!accessToken) return Promise.reject(error);

    request.headers.Authorization = `Bearer ${accessToken}`;
    return api(request);
  },
);
