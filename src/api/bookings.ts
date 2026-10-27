import { api } from './client';
import {
  AvailableServiceItem,
  BookingItem,
  CreateBookingInput,
  DriverAvailability,
} from '@/types/transport';
import { getAccessToken } from '@/utils/secureStorage';

export async function createBookingApi(input: CreateBookingInput): Promise<BookingItem> {
  const response = await api.post<BookingItem>('/bookings', input);
  return response.data;
}

export async function getMyBookingsApi(): Promise<BookingItem[]> {
  const response = await api.get<BookingItem[]>('/bookings/my');
  return response.data;
}

export async function getDriverBookingsApi(): Promise<BookingItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You are signed out. Please log in again to load driver bookings.');
  }

  const response = await api.get<BookingItem[]>('/bookings/driver', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateBookingStatusApi(
  id: string,
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
): Promise<BookingItem> {
  const response = await api.patch<BookingItem>(`/bookings/${encodeURIComponent(id)}/status`, {
    status,
  });
  return response.data;
}

export async function cancelBookingApi(id: string): Promise<void> {
  await api.delete(`/bookings/${encodeURIComponent(id)}`);
}

export async function getAvailableServicesApi(): Promise<AvailableServiceItem[]> {
  const response = await api.get<AvailableServiceItem[]>('/bookings/available-services');
  return response.data;
}

export async function setDriverAvailabilityApi(
  status: DriverAvailability,
): Promise<{ status: DriverAvailability; vehicleType: string; message: string }> {
  const response = await api.patch<{ status: DriverAvailability; vehicleType: string; message: string }>(
    '/driver/availability',
    { status },
  );
  return response.data;
}

export async function getDriverAvailabilityApi(): Promise<{
  status: DriverAvailability;
  vehicleType: string;
}> {
  const response = await api.get<{ status: DriverAvailability; vehicleType: string }>(
    '/driver/availability',
  );
  return response.data;
}

export async function syncDriverLocationApi(
  latitude: number,
  longitude: number,
  driverId?: string,
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>('/driver/location', {
    latitude,
    longitude,
    driverId,
  });
  return response.data;
}
