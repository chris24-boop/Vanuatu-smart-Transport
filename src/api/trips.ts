import { api } from './client';
import { CreateTripInput, TripItem } from '@/types/transport';

export async function listTripsApi(): Promise<TripItem[]> {
  const response = await api.get<TripItem[]>('/trips');
  return response.data;
}

export async function createTripApi(input: CreateTripInput): Promise<TripItem> {
  const response = await api.post<TripItem>('/trips', input);
  return response.data;
}

export async function startTripApi(tripId: string): Promise<TripItem> {
  const response = await api.patch<TripItem>(`/trips/${encodeURIComponent(tripId)}/start`);
  return response.data;
}

export async function completeTripApi(tripId: string): Promise<TripItem> {
  const response = await api.patch<TripItem>(`/trips/${encodeURIComponent(tripId)}/complete`);
  return response.data;
}

export async function cancelTripApi(tripId: string): Promise<void> {
  await api.delete(`/trips/${encodeURIComponent(tripId)}`);
}
