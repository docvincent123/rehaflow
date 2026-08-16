import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { navColors } from '@/lib/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Слухачі push доступні лише на нативних платформах. */
export const pushSupported = Platform.OS !== 'web';

/** Окремий канал для термінових завдань — гучний сигнал і вібрація. */
async function configureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Медичні завдання',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: navColors.accent,
  });
  await Notifications.setNotificationChannelAsync('urgent', {
    name: 'Термінові завдання',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: navColors.urgent,
    sound: 'default',
  });
}

/**
 * Реєструє пристрій для push-повідомлень.
 * Повертає Expo push token або null, якщо це неможливо
 * (веб, емулятор, відмова у дозволі, відсутній EAS projectId).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  try {
    await configureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : {},
    );
    return token.data;
  } catch {
    return null;
  }
}
