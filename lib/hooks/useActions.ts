import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { errorMessage } from '@/lib/api/errors';
import { createPrescription } from '@/lib/api/prescriptions';
import { claimTask, completeTask, startTask } from '@/lib/api/tasks';
import type { CreatePrescriptionInput, MedicalTask } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { useIsOnline } from '@/lib/store/networkStore';
import { useOfflineQueueStore } from '@/lib/store/offlineQueue';

/**
 * Результат серверної дії.
 * 'queued' означає: інтернету немає, дія збережена і виконається пізніше.
 * Успіх користувачу показуємо ЛИШЕ при 'done' — тобто після підтвердження сервера.
 */
export type ActionOutcome =
  | { status: 'done' }
  | { status: 'queued' }
  | { status: 'error'; message: string };

const OFFLINE_MESSAGE = 'Немає з’єднання. Дія буде виконана після відновлення зв’язку';

export function useOfflineNotice(): string {
  return OFFLINE_MESSAGE;
}

export function useTaskActions() {
  const online = useIsOnline();
  const enqueue = useOfflineQueueStore((state) => state.enqueue);
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<'claim' | 'start' | 'complete' | null>(null);

  const invalidate = useCallback(
    async (taskId: string, patientId?: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        patientId
          ? queryClient.invalidateQueries({ queryKey: queryKeys.patientHistory(patientId) })
          : Promise.resolve(),
        patientId
          ? queryClient.invalidateQueries({ queryKey: queryKeys.patientTasks(patientId) })
          : Promise.resolve(),
      ]);
    },
    [queryClient],
  );

  const claim = useCallback(
    async (task: MedicalTask): Promise<ActionOutcome> => {
      if (!online) {
        await enqueue({ kind: 'CLAIM_TASK', taskId: task.id, taskTitle: task.title });
        return { status: 'queued' };
      }
      setPendingAction('claim');
      try {
        await claimTask(task.id);
        await invalidate(task.id, task.patientId);
        return { status: 'done' };
      } catch (error) {
        return { status: 'error', message: errorMessage(error) };
      } finally {
        setPendingAction(null);
      }
    },
    [online, enqueue, invalidate],
  );

  const start = useCallback(
    async (task: MedicalTask): Promise<ActionOutcome> => {
      if (!online) {
        await enqueue({ kind: 'START_TASK', taskId: task.id, taskTitle: task.title });
        return { status: 'queued' };
      }
      setPendingAction('start');
      try {
        await startTask(task.id);
        await invalidate(task.id, task.patientId);
        return { status: 'done' };
      } catch (error) {
        return { status: 'error', message: errorMessage(error) };
      } finally {
        setPendingAction(null);
      }
    },
    [online, enqueue, invalidate],
  );

  const complete = useCallback(
    async (task: MedicalTask, comment: string): Promise<ActionOutcome> => {
      if (!online) {
        await enqueue({
          kind: 'COMPLETE_TASK',
          taskId: task.id,
          taskTitle: task.title,
          comment,
        });
        return { status: 'queued' };
      }
      setPendingAction('complete');
      try {
        await completeTask(task.id, comment);
        await invalidate(task.id, task.patientId);
        return { status: 'done' };
      } catch (error) {
        return { status: 'error', message: errorMessage(error) };
      } finally {
        setPendingAction(null);
      }
    },
    [online, enqueue, invalidate],
  );

  return { claim, start, complete, pendingAction };
}

export function useCreatePrescriptionAction() {
  const online = useIsOnline();
  const enqueue = useOfflineQueueStore((state) => state.enqueue);
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (input: CreatePrescriptionInput): Promise<ActionOutcome> => {
      if (!online) {
        await enqueue({ kind: 'CREATE_PRESCRIPTION', payload: input });
        return { status: 'queued' };
      }
      setSubmitting(true);
      try {
        await createPrescription(input);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
          queryClient.invalidateQueries({ queryKey: queryKeys.prescriptions }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.patientPrescriptions(input.patientId),
          }),
          queryClient.invalidateQueries({ queryKey: queryKeys.patientTasks(input.patientId) }),
        ]);
        return { status: 'done' };
      } catch (error) {
        return { status: 'error', message: errorMessage(error) };
      } finally {
        setSubmitting(false);
      }
    },
    [online, enqueue, queryClient],
  );

  return { submit, submitting };
}
