import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CACHE_KEYS = {
  TRIPS: 'cache_trips_v1',
  AVAILABLE_SERVICES: 'cache_services_v1',
  MY_BOOKINGS: 'cache_my_bookings_v1',
  DRIVER_BOOKINGS: 'cache_driver_bookings_v1',
  OFFLINE_QUEUE: 'cache_offline_queue_v1',
};

async function writeStorage(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.warn(`[OfflineCache] Failed to write key ${key}:`, error);
  }
}

async function readStorage(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[OfflineCache] Failed to read key ${key}:`, error);
    return null;
  }
}

export const offlineCache = {
  async saveTrips(trips: any[]): Promise<void> {
    if (!Array.isArray(trips) || trips.length === 0) return;
    await writeStorage(CACHE_KEYS.TRIPS, JSON.stringify(trips));
  },

  async getTrips(): Promise<any[]> {
    const data = await readStorage(CACHE_KEYS.TRIPS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async saveAvailableServices(services: any[]): Promise<void> {
    if (!Array.isArray(services) || services.length === 0) return;
    await writeStorage(CACHE_KEYS.AVAILABLE_SERVICES, JSON.stringify(services));
  },

  async getAvailableServices(): Promise<any[]> {
    const data = await readStorage(CACHE_KEYS.AVAILABLE_SERVICES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async saveMyBookings(bookings: any[]): Promise<void> {
    if (!Array.isArray(bookings)) return;
    await writeStorage(CACHE_KEYS.MY_BOOKINGS, JSON.stringify(bookings));
  },

  async getMyBookings(): Promise<any[]> {
    const data = await readStorage(CACHE_KEYS.MY_BOOKINGS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async saveDriverBookings(bookings: any[]): Promise<void> {
    if (!Array.isArray(bookings)) return;
    await writeStorage(CACHE_KEYS.DRIVER_BOOKINGS, JSON.stringify(bookings));
  },

  async getDriverBookings(): Promise<any[]> {
    const data = await readStorage(CACHE_KEYS.DRIVER_BOOKINGS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async enqueueOfflineAction(action: { type: string; payload: any; timestamp: string }): Promise<void> {
    const existing = await readStorage(CACHE_KEYS.OFFLINE_QUEUE);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(action);
    await writeStorage(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  async getOfflineQueue(): Promise<any[]> {
    const data = await readStorage(CACHE_KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  },

  async clearOfflineQueue(): Promise<void> {
    await writeStorage(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  },
};
