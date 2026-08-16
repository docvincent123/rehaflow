import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Токени зберігаються у Expo SecureStore (нативно) або в localStorage (веб,
 * де SecureStore недоступний). Пароль користувача не зберігається ніколи.
 */
const ACCESS_KEY = 'rehaflow_access_token';
const REFRESH_KEY = 'rehaflow_refresh_token';

const isWeb = Platform.OS === 'web';

let accessCache: string | null = null;
let refreshCache: string | null = null;
let hydrated = false;

async function readItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeItem(key: string, value: string | null): Promise<void> {
  try {
    if (isWeb) {
      if (typeof localStorage === 'undefined') return;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Сховище недоступне — працюємо лише з памʼяттю процесу.
  }
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  accessCache = await readItem(ACCESS_KEY);
  refreshCache = await readItem(REFRESH_KEY);
  hydrated = true;
}

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    await hydrate();
    return accessCache;
  },

  async getRefreshToken(): Promise<string | null> {
    await hydrate();
    return refreshCache;
  },

  /** Синхронне читання для заголовків запиту (після hydrate). */
  peekAccessToken(): string | null {
    return accessCache;
  },

  async save(tokens: { accessToken: string; refreshToken?: string | null }): Promise<void> {
    hydrated = true;
    accessCache = tokens.accessToken;
    await writeItem(ACCESS_KEY, tokens.accessToken);
    if (tokens.refreshToken !== undefined) {
      refreshCache = tokens.refreshToken ?? null;
      await writeItem(REFRESH_KEY, tokens.refreshToken ?? null);
    }
  },

  async clear(): Promise<void> {
    hydrated = true;
    accessCache = null;
    refreshCache = null;
    await writeItem(ACCESS_KEY, null);
    await writeItem(REFRESH_KEY, null);
  },
};
