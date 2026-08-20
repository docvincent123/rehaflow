import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MedicalTask } from '@/lib/api/types';

let configured = false;
const repeatingNotificationIds = new Map<string, string>();
let summaryNotificationId: string | null = null;
let lastSummaryKey = '';

const SUMMARY_TAG = 'rehaflow-task-status';

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
      await Notifications.setNotificationChannelAsync('rehaflow-status', {
        name: 'Стан завдань',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        sound: undefined,
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
      trigger: repeats
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 20, repeats: true }
        : null,
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

function buildSummary(tasks: MedicalTask[]): { title: string; body: string; key: string } {
  const open = tasks.filter((task) => ['CREATED', 'AVAILABLE'].includes(task.status));
  const active = tasks.filter((task) => ['CLAIMED', 'IN_PROGRESS'].includes(task.status));
  const urgent = tasks.filter((task) => task.priority === 'URGENT' && !['COMPLETED', 'CANCELLED'].includes(task.status));

  if (open.length === 0 && active.length === 0) {
    return {
      title: 'RehaFlow · Завдань немає',
      body: 'Нових та активних медичних завдань зараз немає.',
      key: 'empty',
    };
  }

  const parts: string[] = [];
  if (open.length) parts.push(`нових: ${open.length}`);
  if (active.length) parts.push(`активних: ${active.length}`);
  if (urgent.length) parts.push(`термінових: ${urgent.length}`);

  return {
    title: urgent.length ? 'RehaFlow · Є термінові завдання' : 'RehaFlow · Стан завдань',
    body: parts.join(' · '),
    key: `${open.length}|${active.length}|${urgent.length}`,
  };
}

/**
 * Keeps a single summary notification in the Android notification shade
 * (and Notification Center on iOS) with the current task state.
 */
export async function syncTaskSummary(tasks: MedicalTask[]): Promise<void> {
  const ready = await configureTaskAlerts();
  if (!ready) return;

  const summary = buildSummary(tasks);
  if (summary.key === lastSummaryKey && summaryNotificationId) return;
  lastSummaryKey = summary.key;

  if (summaryNotificationId) {
    try { await Notifications.dismissNotificationAsync(summaryNotificationId); } catch {}
    summaryNotificationId = null;
  }

  try {
    summaryNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: summary.title,
        body: summary.body,
        data: { route: '/tasks', kind: SUMMARY_TAG },
        ...(Platform.OS === 'android'
          ? { sticky: true, autoDismiss: false, channelId: 'rehaflow-status' }
          : {}),
      },
      trigger: null,
    });
  } catch {
    summaryNotificationId = null;
  }
}

export async function clearTaskSummary(): Promise<void> {
  lastSummaryKey = '';
  if (!summaryNotificationId) return;
  try { await Notifications.dismissNotificationAsync(summaryNotificationId); } catch {}
  summaryNotificationId = null;
}
