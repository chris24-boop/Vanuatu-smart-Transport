import { api } from './client';
import { DriverApplicant } from '@/types/transport';

export async function listDriversApi(): Promise<DriverApplicant[]> {
  const response = await api.get<DriverApplicant[]>('/admin/drivers');
  return response.data;
}

export async function verifyDriverApi(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/admin/drivers/${userId}/verify`);
  return response.data;
}

export async function suspendDriverApi(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/admin/drivers/${userId}/suspend`);
  return response.data;
}

export async function rejectDriverApi(
  userId: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/admin/drivers/${userId}/reject`, {
    reason: reason?.trim() || 'No reason provided',
  });
  return response.data;
}
