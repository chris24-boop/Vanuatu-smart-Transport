import { api } from './client';
import { getAccessToken } from '@/utils/secureStorage';

export interface CreateIncidentPayload {
  tripId?: string;
  category: string;
  description: string;
  vehiclePlate?: string;
  driverName?: string;
  location?: string;
  reporterPhone?: string;
}

export interface IncidentResponse {
  id: string;
  reporterId: string;
  tripId?: string;
  category: string;
  description: string;
  vehiclePlate: string;
  driverName: string;
  location: string;
  reporterPhone: string;
  status: string;
  createdAt: string;
}

export async function createIncidentApi(payload: CreateIncidentPayload): Promise<IncidentResponse> {
  const response = await api.post<IncidentResponse>('/incidents', payload);
  return response.data;
}

export async function listIncidentsApi(status?: string): Promise<IncidentResponse[]> {
  const token = await getAccessToken();
  const response = await api.get<IncidentResponse[]>('/incidents', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params: status ? { status } : undefined,
  });
  return response.data;
}

export async function updateIncidentStatusApi(
  id: string,
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED',
): Promise<IncidentResponse> {
  const token = await getAccessToken();
  const response = await api.patch<IncidentResponse>(
    `/incidents/${encodeURIComponent(id)}/status`,
    { status },
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
  );
  return response.data;
}

export async function rateBookingApi(
  bookingId: string,
  rating: number,
  comment?: string,
): Promise<{ success: boolean; message: string; rating: number }> {
  const response = await api.post<{ success: boolean; message: string; rating: number }>(
    `/bookings/${encodeURIComponent(bookingId)}/rate`,
    { rating, comment },
  );
  return response.data;
}
