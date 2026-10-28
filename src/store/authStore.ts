import { create } from 'zustand';
import { User } from '@/types/user';
import {
  loginApi,
  registerApi,
  logoutApi,
  getMeApi,
  LoginRequest,
  RegisterRequest,
} from '@/api/auth';
import {
  saveAccessToken,
  saveRefreshToken,
  getAccessToken,
  clearTokens,
  setSessionExpiredHandler,
} from '@/utils/secureStorage';
import { offlineCache } from '@/utils/offlineCache';
import { resetTransportData } from './transportStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await loginApi(data);
      await saveAccessToken(response.accessToken);
      await saveRefreshToken(response.refreshToken);
      await offlineCache.setUserScope(response.user.id);
      resetTransportData();
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await registerApi(data);
      await saveAccessToken(response.accessToken);
      await saveRefreshToken(response.refreshToken);
      await offlineCache.setUserScope(response.user.id);
      resetTransportData();
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error.request
          ? 'Unable to reach the server. Check the API URL and your connection.'
          : 'Registration failed. Please try again.');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch {
      console.warn('Could not revoke the server session; local credentials were cleared.');
    } finally {
      await offlineCache.clearUserData();
      try {
        await clearTokens();
      } catch {
        console.warn('Could not clear stored credentials from secure storage.');
      }
      resetTransportData();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  loadToken: async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        try {
          const user = await getMeApi();
          await offlineCache.setUserScope(user.id);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          await offlineCache.clearUserData();
          await clearTokens();
          resetTransportData();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        await offlineCache.clearUserData();
        resetTransportData();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      await offlineCache.clearUserData();
      resetTransportData();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

setSessionExpiredHandler(async () => {
  await offlineCache.clearUserData();
  resetTransportData();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});
