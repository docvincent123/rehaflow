import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MedicalTask } from '@/lib/api/types';

let configured = false;

export async function configureTaskAlerts(): Promise<boolean> {
  if (configured) return true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rehaflow-tasks', {
        name: 'Медичні завдання',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 120, 250],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    configured = true;
    return true;
  } catch {
    return false;
  }
}

export async function ringForNewTask(task: MedicalTask): Promise<void> {
  const ready = await configureTaskAlerts();
  if (!ready) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: task.priority === 'URGENT' ? '🔔 Термінове медичне завдання' : '🔔 Нове медичне завдання',
        body: `${task.patientName} · ${task.title}`,
        sound: 'default',
        data: { taskId: task.id, route: `/task/${task.id}` },
      },
      trigger: null,
    });
  } catch {
    // Notification failures must never break the task feed.
  }
}
