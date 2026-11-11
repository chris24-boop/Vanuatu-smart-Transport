import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

let accessTokenCache: string | null | undefined;
let sessionExpiredHandler: (() => void | Promise<void>) | undefined;

function getWebSessionStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.sessionStorage;
}

async function setStoredValue(key: string, value: string): Promise<void> {
  const storage = getWebSessionStorage();
  if (Platform.OS === 'web') {
    if (!storage) throw new Error('Browser session storage is unavailable.');
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStoredValue(key: string): Promise<string | null> {
  const storage = getWebSessionStorage();
  if (Platform.OS === 'web') return storage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function removeStoredValue(key: string): Promise<void> {
  const storage = getWebSessionStorage();
  if (Platform.OS === 'web') {
    storage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function setSessionExpiredHandler(
  handler: () => void | Promise<void>,
): void {
  sessionExpiredHandler = handler;
}

export async function notifySessionExpired(): Promise<void> {
  await sessionExpiredHandler?.();
}

export async function saveAccessToken(token: string): Promise<void> {
  await setStoredValue(ACCESS_TOKEN_KEY, token);
  accessTokenCache = token;
}

export async function getAccessToken(): Promise<string | null> {
  if (accessTokenCache !== undefined) {
    return accessTokenCache;
  }

  accessTokenCache = await getStoredValue(ACCESS_TOKEN_KEY);
  return accessTokenCache;
}

export async function removeAccessToken(): Promise<void> {
  accessTokenCache = null;
  await removeStoredValue(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await setStoredValue(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getStoredValue(REFRESH_TOKEN_KEY);
}

export async function removeRefreshToken(): Promise<void> {
  await removeStoredValue(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([removeAccessToken(), removeRefreshToken()]);
}
