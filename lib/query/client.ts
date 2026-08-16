import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

import { CACHE_MAX_AGE_MS } from '@/lib/api/config';

/**
 * networkMode: 'offlineFirst' — запити стартують навіть без мережі, швидко
 * падають і показують раніше закешовані дані замість блокування екрана.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      retry: 1,
      staleTime: 10_000,
      gcTime: CACHE_MAX_AGE_MS,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'online',
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rehaflow.query-cache',
  throttleTime: 1000,
});
