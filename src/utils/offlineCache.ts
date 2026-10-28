import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  AvailableServiceItem,
  BookingItem,
  TripItem,
} from '@/types/transport';

const CACHE_KEYS = {
  TRIPS: 'cache_trips_v1',
  AVAILABLE_SERVICES: 'cache_services_v1',
  MY_BOOKINGS: 'cache_my_bookings_v1',
  DRIVER_BOOKINGS: 'cache_driver_bookings_v1',
  OFFLINE_QUEUE: 'cache_offline_queue_v1',
};
const USER_SCOPE_KEY = 'cache_user_scope_v1';

let activeUserId: string | null = null;

function scopedKey(key: string): string | null {
  return activeUserId ? `${key}:${encodeURIComponent(activeUserId)}` : null;
}

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

async function removeStorage(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.warn(`[OfflineCache] Failed to remove key ${key}:`, error);
  }
}

async function removeUserData(userId: string): Promise<void> {
  await Promise.all(
    Object.values(CACHE_KEYS).map((key) =>
      removeStorage(`${key}:${encodeURIComponent(userId)}`),
    ),
  );
}

async function removeLegacyCacheData(): Promise<void> {
  await Promise.all(Object.values(CACHE_KEYS).map(removeStorage));
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

async function readArray<T>(key: string): Promise<T[]> {
  const data = await readStorage(key);
  if (!data) return [];
  try {
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export const offlineCache = {
  async setUserScope(userId: string | null): Promise<void> {
    if (!userId) {
      await this.clearUserData();
      return;
    }

    const previousUserId = activeUserId ?? await readStorage(USER_SCOPE_KEY);
    if (previousUserId && previousUserId !== userId) {
      await removeUserData(previousUserId);
    }
    await removeLegacyCacheData();
    activeUserId = userId;
    await writeStorage(USER_SCOPE_KEY, userId);
  },

  async clearUserData(): Promise<void> {
    const userId = activeUserId ?? await readStorage(USER_SCOPE_KEY);
    activeUserId = null;
    await removeStorage(USER_SCOPE_KEY);
    await removeLegacyCacheData();
    if (userId) await removeUserData(userId);
  },

  async saveTrips(trips: TripItem[]): Promise<void> {
    const key = scopedKey(CACHE_KEYS.TRIPS);
    if (!key) return;
    await writeStorage(key, JSON.stringify(trips));
  },

  async getTrips(): Promise<TripItem[]> {
    const key = scopedKey(CACHE_KEYS.TRIPS);
    return key ? readArray<TripItem>(key) : [];
  },

  async saveAvailableServices(services: AvailableServiceItem[]): Promise<void> {
    const key = scopedKey(CACHE_KEYS.AVAILABLE_SERVICES);
    if (!key) return;
    await writeStorage(key, JSON.stringify(services));
  },

  async getAvailableServices(): Promise<AvailableServiceItem[]> {
    const key = scopedKey(CACHE_KEYS.AVAILABLE_SERVICES);
    return key ? readArray<AvailableServiceItem>(key) : [];
  },

  async saveMyBookings(bookings: BookingItem[]): Promise<void> {
    const key = scopedKey(CACHE_KEYS.MY_BOOKINGS);
    if (!key) return;
    await writeStorage(key, JSON.stringify(bookings));
  },

  async getMyBookings(): Promise<BookingItem[]> {
    const key = scopedKey(CACHE_KEYS.MY_BOOKINGS);
    return key ? readArray<BookingItem>(key) : [];
  },

  async saveDriverBookings(bookings: BookingItem[]): Promise<void> {
    const key = scopedKey(CACHE_KEYS.DRIVER_BOOKINGS);
    if (!key) return;
    await writeStorage(key, JSON.stringify(bookings));
  },

  async getDriverBookings(): Promise<BookingItem[]> {
    const key = scopedKey(CACHE_KEYS.DRIVER_BOOKINGS);
    return key ? readArray<BookingItem>(key) : [];
  },

  async enqueueOfflineAction(action: { type: string; payload: unknown; timestamp: string }): Promise<void> {
    const key = scopedKey(CACHE_KEYS.OFFLINE_QUEUE);
    if (!key) return;
    const queue = await readArray<typeof action>(key);
    queue.push(action);
    await writeStorage(key, JSON.stringify(queue));
  },

  async getOfflineQueue(): Promise<{ type: string; payload: unknown; timestamp: string }[]> {
    const key = scopedKey(CACHE_KEYS.OFFLINE_QUEUE);
    return key ? readArray<{ type: string; payload: unknown; timestamp: string }>(key) : [];
  },

  async clearOfflineQueue(): Promise<void> {
    const key = scopedKey(CACHE_KEYS.OFFLINE_QUEUE);
    if (key) await writeStorage(key, JSON.stringify([]));
  },
};
