import { endpoints } from './endpoints';
import { apiRequest } from './http';
import { mapHistoryEntry, mapPrescription } from './mappers';
import { pickCollection, pickEntity } from './normalize';
import type { CreatePrescriptionInput, HistoryEntry, Prescription } from './types';
import { getDeviceMeta } from '@/lib/device';

/** Створення призначення: тільки лікар. Сервер створює завдання для вибраної ролі. */
export async function createPrescription(input: CreatePrescriptionInput): Promise<Prescription> {
  const payload = await apiRequest(endpoints.prescriptions.create, {
    method: 'POST',
    body: {
      patientId: input.patientId,
      roomId: input.roomId,
      roomNumber: input.roomNumber,
      bedId: input.bedId,
      bedNumber: input.bedNumber,
      type: input.type,
      title: input.title.trim(),
      details: input.details?.trim() || undefined,
      scheduledAt: input.scheduledAt,
      priority: input.priority,
      targetRole: input.targetRole,
      createTask: true,
      source: 'mobile',
      deviceId: getDeviceMeta()?.deviceId,
    },
  });
  return mapPrescription(pickEntity(payload, ['prescription', 'treatment']));
}

export async function fetchPrescriptions(): Promise<Prescription[]> {
  const payload = await apiRequest(endpoints.prescriptions.list, { query: { limit: 300 } });
  return pickCollection(payload, ['prescriptions', 'treatments']).map(mapPrescription);
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const payload = await apiRequest(endpoints.history, { query: { limit: 300 } });
  return pickCollection(payload, ['history', 'entries', 'manipulations']).map(mapHistoryEntry);
}
