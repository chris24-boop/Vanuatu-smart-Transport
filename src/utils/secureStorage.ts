import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

let accessTokenCache: string | null | undefined;
let sessionExpiredHandler: (() => void | Promise<void>) | undefined;

export function setSessionExpiredHandler(
  handler: () => void | Promise<void>,
): void {
  sessionExpiredHandler = handler;
}

export async function notifySessionExpired(): Promise<void> {
  await sessionExpiredHandler?.();
}

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  accessTokenCache = token;
}

export async function getAccessToken(): Promise<string | null> {
  if (accessTokenCache !== undefined) {
    return accessTokenCache;
  }

  accessTokenCache = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return accessTokenCache;
}

export async function removeAccessToken(): Promise<void> {
  accessTokenCache = null;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function removeRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([removeAccessToken(), removeRefreshToken()]);
}
