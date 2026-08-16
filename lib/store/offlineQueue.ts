import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { errorMessage, isNetworkError } from '@/lib/api/errors';
import { createPrescription } from '@/lib/api/prescriptions';
import { claimTask, completeTask, startTask } from '@/lib/api/tasks';
import type { CreatePrescriptionInput } from '@/lib/api/types';
import { queryClient } from '@/lib/query/client';
import { useNetworkStore } from './networkStore';

const QUEUE_KEY = 'rehaflow.offline-queue';

export type QueuedAction =
  | { id: string; createdAt: string; kind: 'CLAIM_TASK'; taskId: string; taskTitle: string }
  | { id: string; createdAt: string; kind: 'START_TASK'; taskId: string; taskTitle: string }
  | {
      id: string;
      createdAt: string;
      kind: 'COMPLETE_TASK';
      taskId: string;
      taskTitle: string;
      comment: string;
    }
  | {
      id: string;
      createdAt: string;
      kind: 'CREATE_PRESCRIPTION';
      payload: CreatePrescriptionInput;
    };

type NewQueuedAction = QueuedAction extends infer Action
  ? Action extends QueuedAction
    ? Omit<Action, 'id' | 'createdAt'>
    : never
  : never;

export interface QueueNotice {
  id: string;
  tone: 'success' | 'error';
  message: string;
}

interface QueueState {
  actions: QueuedAction[];
  flushing: boolean;
  notices: QueueNotice[];
  hydrate: () => Promise<void>;
  enqueue: (action: NewQueuedAction) => Promise<void>;
  flush: () => Promise<void>;
  dismissNotice: (id: string) => void;
}

function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function persist(actions: QueuedAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
  } catch {
    // Черга залишиться лише в памʼяті процесу.
  }
}

async function runAction(action: QueuedAction): Promise<string> {
  switch (action.kind) {
    case 'CLAIM_TASK': {
      await claimTask(action.taskId);
      return `Завдання «${action.taskTitle}» закріплено за вами`;
    }
    case 'START_TASK': {
      await startTask(action.taskId);
      return `Завдання «${action.taskTitle}» переведено у виконання`;
    }
    case 'COMPLETE_TASK': {
      await completeTask(action.taskId, action.comment);
      return `Завдання «${action.taskTitle}» виконано`;
    }
    case 'CREATE_PRESCRIPTION': {
      await createPrescription(action.payload);
      return `Призначення «${action.payload.title}» надіслано`;
    }
    default:
      return 'Дію виконано';
  }
}

export const useOfflineQueueStore = create<QueueState>((set, get) => ({
  actions: [],
  flushing: false,
  notices: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) set({ actions: JSON.parse(raw) as QueuedAction[] });
    } catch {
      set({ actions: [] });
    }
  },

  enqueue: async (action) => {
    const queued = { ...action, id: nextId(), createdAt: new Date().toISOString() };
    const actions = [...get().actions, queued];
    set({ actions });
    await persist(actions);
  },

  /**
   * Послідовне виконання відкладених дій. Мережева помилка — зупиняємось і
   * лишаємо дію в черзі. Відмова сервера (403/409) — дію знімаємо та
   * повідомляємо користувача, бо повторювати її немає сенсу.
   */
  flush: async () => {
    if (get().flushing) return;
    if (!useNetworkStore.getState().online) return;
    if (get().actions.length === 0) return;

    set({ flushing: true });
    const pending = [...get().actions];
    const notices: QueueNotice[] = [];

    while (pending.length > 0) {
      const action = pending[0];
      if (!action) break;
      try {
        const message = await runAction(action);
        notices.push({ id: nextId(), tone: 'success', message });
        pending.shift();
      } catch (error) {
        if (isNetworkError(error)) break;
        notices.push({ id: nextId(), tone: 'error', message: errorMessage(error) });
        pending.shift();
      }
    }

    set((state) => ({
      actions: pending,
      flushing: false,
      notices: [...state.notices, ...notices].slice(-5),
    }));
    await persist(pending);

    if (notices.length > 0) {
      await queryClient.invalidateQueries();
    }
  },

  dismissNotice: (id) => {
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) }));
  },
}));

export const usePendingActionCount = () => useOfflineQueueStore((state) => state.actions.length);
