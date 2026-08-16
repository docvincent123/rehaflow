import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';

import { DEVICE_HEARTBEAT_MS } from '@/lib/api/config';
import { registerPushToken, sendDeviceHeartbeat } from '@/lib/api/devices';
import { registerForPushNotifications, pushSupported } from '@/lib/notifications';
import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStatus } from '@/lib/store/authStore';
import { subscribeToNetwork, useIsOnline, useNetworkStore } from '@/lib/store/networkStore';
import { useOfflineQueueStore } from '@/lib/store/offlineQueue';

/**
 * Фонова синхронізація застосунку:
 *  - стан мережі;
 *  - повторна відправка відкладених дій після відновлення інтернету;
 *  - оновлення "остання активність" пристрою у вебсистемі;
 *  - оновлення даних при поверненні застосунку на передній план;
 *  - push-повідомлення оновлюють список завдань без ручного оновлення.
 */
export function useAppSync(): void {
  const status = useAuthStatus();
  const online = useIsOnline();
  const flush = useOfflineQueueStore((state) => state.flush);
  const hydrateQueue = useOfflineQueueStore((state) => state.hydrate);
  const wasOnline = useRef(online);

  useEffect(() => subscribeToNetwork(), []);

  useEffect(() => {
    void hydrateQueue();
  }, [hydrateQueue]);

  useEffect(() => {
    if (!wasOnline.current && online) {
      void flush();
      void queryClient.invalidateQueries();
    }
    wasOnline.current = online;
  }, [online, flush]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;

    const tick = () => {
      if (!useNetworkStore.getState().online) return;
      void sendDeviceHeartbeat().catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, DEVICE_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void queryClient.invalidateQueries();
      void flush();
    });
    return () => subscription.remove();
  }, [status, flush]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    if (!pushSupported) return undefined;

    let cancelled = false;
    void registerForPushNotifications().then((token) => {
      if (!token || cancelled) return;
      void registerPushToken(token).catch(() => undefined);
    });

    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    });
    const responded = Notifications.addNotificationResponseReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    });

    return () => {
      cancelled = true;
      received.remove();
      responded.remove();
    };
  }, [status]);
}
