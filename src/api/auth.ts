import { api } from './client';
import { User } from '@/types/user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  role?: string;
  licenceNumber?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  island?: string;
}

export interface RequestPasswordReset {
  phone: string;
}

export interface ConfirmPasswordReset {
  phone: string;
  code: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
}

export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function getMeApi(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

export async function refreshTokenApi(refreshToken: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}

export async function requestPasswordResetApi(
  data: RequestPasswordReset,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/auth/password-reset/request',
    data,
  );
  return response.data;
}

export async function confirmPasswordResetApi(
  data: ConfirmPasswordReset,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/auth/password-reset/confirm',
    data,
  );
  return response.data;
}
