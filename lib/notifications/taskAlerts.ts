import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MedicalTask } from '@/lib/api/types';

let configured = false;
const repeatingNotificationIds = new Map<string, string>();

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

async function schedule(task: MedicalTask, repeats: boolean): Promise<void> {
  const ready = await configureTaskAlerts();
  if (!ready) return;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.priority === 'URGENT' ? '🔔 Термінове медичне завдання' : '🔔 Нове медичне завдання',
        body: `${task.patientName} · ${task.title}`,
        sound: 'default',
        data: { taskId: task.id, route: `/task/${task.id}` },
      },
      trigger: repeats ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 20, repeats: true } : null,
    });
    if (repeats) repeatingNotificationIds.set(task.id, id);
  } catch {
    // Notification failures must never break the task feed.
  }
}

export async function ringForNewTask(task: MedicalTask): Promise<void> {
  await schedule(task, false);
}

export async function startTaskRinging(task: MedicalTask): Promise<void> {
  if (repeatingNotificationIds.has(task.id)) return;
  await schedule(task, true);
}

export async function stopTaskRinging(taskId: string): Promise<void> {
  const notificationId = repeatingNotificationIds.get(taskId);
  if (!notificationId) return;
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch {}
  repeatingNotificationIds.delete(taskId);
}
