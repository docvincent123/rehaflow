import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchMe, login, logout, logoutAllDevices } from '@/lib/api/auth';
import { registerDevice } from '@/lib/api/devices';
import { ApiError, isNetworkError } from '@/lib/api/errors';
import { setUnauthorizedHandler } from '@/lib/api/http';
import { tokenStorage } from '@/lib/api/tokens';
import type { User } from '@/lib/api/types';
import { initDeviceMeta } from '@/lib/device';
import { queryClient } from '@/lib/query/client';

const USER_CACHE_KEY = 'rehaflow.user';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** true, коли профіль показано з кешу і сервер ще не підтвердив. */
  fromCache: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forceSignOut: () => void;
}

async function readCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

async function writeCachedUser(user: User | null): Promise<void> {
  try {
    if (user) await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Кеш профілю не критичний.
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  fromCache: false,

  hydrate: async () => {
    await initDeviceMeta();
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null, fromCache: false });
      return;
    }

    // Сесія відновлюється негайно з кешу — застосунок не блокується мережею.
    const cachedUser = await readCachedUser();
    set({ status: 'authenticated', user: cachedUser, fromCache: cachedUser !== null });

    await get().refreshProfile();
  },

  refreshProfile: async () => {
    try {
      const user = await fetchMe();
      set({ user, fromCache: false });
      await writeCachedUser(user);
      await registerDevice();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        get().forceSignOut();
        return;
      }
      // Офлайн або тимчасова помилка сервера — залишаємо кешований профіль.
      if (!isNetworkError(error)) return;
    }
  },

  signIn: async (email, password) => {
    await initDeviceMeta();
    const result = await login(email, password);
    await tokenStorage.save({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    let user = result.user;
    if (!user || !user.id) {
      user = await fetchMe();
    }
    await writeCachedUser(user);
    set({ status: 'authenticated', user, fromCache: false });

    try {
      await registerDevice();
    } catch {
      // Реєстрація пристрою повториться при наступному запуску/heartbeat.
    }
  },

  signOut: async () => {
    try {
      await logout();
    } catch {
      await tokenStorage.clear();
    }
    await writeCachedUser(null);
    queryClient.clear();
    set({ status: 'unauthenticated', user: null, fromCache: false });
  },

  signOutEverywhere: async () => {
    try {
      await logoutAllDevices();
    } catch {
      await tokenStorage.clear();
    }
    await writeCachedUser(null);
    queryClient.clear();
    set({ status: 'unauthenticated', user: null, fromCache: false });
  },

  forceSignOut: () => {
    void tokenStorage.clear();
    void writeCachedUser(null);
    queryClient.clear();
    set({ status: 'unauthenticated', user: null, fromCache: false });
  },
}));

/**
 * Коли сервер остаточно відкинув сесію — вихід. Втрата інтернету сюди не
 * потрапляє: NetworkError не доходить до цього обробника.
 */
setUnauthorizedHandler(() => {
  useAuthStore.getState().forceSignOut();
});

export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useAuthStatus = () => useAuthStore((state) => state.status);
export const useUserRole = () => useAuthStore((state) => state.user?.role ?? null);
