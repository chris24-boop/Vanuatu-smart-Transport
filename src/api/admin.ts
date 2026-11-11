import { api } from './client';
import { getAccessToken } from '@/utils/secureStorage';
import { AdminActivityItem, DriverApplicant, LiveTripLocation } from '@/types/transport';

export async function listDriversApi(): Promise<DriverApplicant[]> {
  const response = await api.get<DriverApplicant[]>('/admin/drivers');
  return response.data;
}

export async function verifyDriverApi(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/admin/drivers/${userId}/verify`);
  return response.data;
}

export async function suspendDriverApi(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const response = await api.patch<{ success: boolean; message: string }>(`/admin/drivers/${userId}/suspend`, { reason });
  return response.data;
}

export async function reviewDriverDocumentApi(
  userId: string,
  documentId: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string,
): Promise<void> {
  await api.patch(`/admin/drivers/${encodeURIComponent(userId)}/documents/${encodeURIComponent(documentId)}`, {
    status,
    reason,
  });
}

export async function getDriverDocumentApi(userId: string, documentId: string): Promise<Blob> {
  const response = await api.get<Blob>(
    `/admin/drivers/${encodeURIComponent(userId)}/documents/${encodeURIComponent(documentId)}`,
    { responseType: 'blob' },
  );
  return response.data;
}

export async function listAdminActivityApi(): Promise<AdminActivityItem[]> {
  const response = await api.get<AdminActivityItem[]>('/admin/activity');
  return response.data;
}

export async function listLiveOperationsApi(): Promise<LiveTripLocation[]> {
  const response = await api.get<LiveTripLocation[]>('/admin/operations/live');
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
