import { endpoints } from './endpoints';
import { TaskTakenError } from './errors';
import { apiRequest } from './http';
import { mapTask } from './taskMapper';
import { asRecord, pickCollection, pickEntity, readString } from './normalize';
import type { MedicalTask, TaskStatus } from './types';
import { ApiError } from './errors';
import { getDeviceMeta } from '@/lib/device';

export async function fetchTasks(): Promise<MedicalTask[]> {
  const payload = await apiRequest(endpoints.tasks.list, { query: { limit: 300 } });
  return pickCollection(payload, ['tasks', 'assignments']).map(mapTask).filter((task) => task.id);
}

export async function fetchTask(id: string): Promise<MedicalTask> {
  const payload = await apiRequest(endpoints.tasks.detail(id));
  return mapTask(pickEntity(payload, ['task', 'assignment']));
}

export async function claimTask(id: string): Promise<MedicalTask> {
  try {
    const payload = await apiRequest(endpoints.tasks.claim(id), { method: 'POST', body: { deviceId: getDeviceMeta()?.deviceId } });
    const returned = mapTask(pickEntity(payload, ['task', 'assignment']));
    try { return await fetchTask(id); } catch { return returned; }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const record = asRecord(error.payload);
      const claimedByName = readString(record, ['claimedByName', 'nurseName', 'assigneeName']) ?? readString(asRecord(record.task ?? record.data), ['claimedByName', 'nurseName', 'assigneeName']);
      throw new TaskTakenError(claimedByName ? `Завдання вже виконується ${claimedByName}` : 'Завдання вже виконується іншим працівником', claimedByName, error.payload);
    }
    throw error;
  }
}

export async function startTask(id: string): Promise<MedicalTask> {
  const payload = await apiRequest(endpoints.tasks.start(id), { method: 'POST', body: { deviceId: getDeviceMeta()?.deviceId } });
  return mapTask(pickEntity(payload, ['task', 'assignment']));
}

export async function completeTask(id: string, comment: string): Promise<MedicalTask> {
  const device = getDeviceMeta();
  const payload = await apiRequest(endpoints.tasks.complete(id), { method: 'POST', body: { comment: comment.trim(), completedAt: new Date().toISOString(), deviceId: device?.deviceId, device: device?.label } });
  return mapTask(pickEntity(payload, ['task', 'assignment']));
}

export async function cancelTask(id: string, reason: string): Promise<MedicalTask> {
  const payload = await apiRequest(endpoints.tasks.cancel(id), { method: 'POST', body: { reason: reason.trim(), deviceId: getDeviceMeta()?.deviceId } });
  return mapTask(pickEntity(payload, ['task', 'assignment']));
}

const OPEN_STATUSES: TaskStatus[] = ['CREATED', 'AVAILABLE'];
const WORKING_STATUSES: TaskStatus[] = ['CLAIMED', 'IN_PROGRESS'];
export function isOpenTask(task: MedicalTask): boolean { return OPEN_STATUSES.includes(task.status); }
export function isWorkingTask(task: MedicalTask): boolean { return WORKING_STATUSES.includes(task.status); }
export function isMyTask(task: MedicalTask, userId: string | undefined): boolean { return Boolean(userId) && task.claimedById === userId; }
export function sortTasks(tasks: MedicalTask[]): MedicalTask[] {
  return [...tasks].sort((left, right) => {
    if (left.priority !== right.priority) return left.priority === 'URGENT' ? -1 : 1;
    const leftTime = left.scheduledAt ? Date.parse(left.scheduledAt) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduledAt ? Date.parse(right.scheduledAt) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}
