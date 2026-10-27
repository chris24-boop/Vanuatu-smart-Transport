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
} from '@/utils/secureStorage';

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
      // Continue logout even if API call fails
    } finally {
      await clearTokens();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  loadToken: async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        try {
          const user = await getMeApi();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          await clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
