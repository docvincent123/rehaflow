import { endpoints } from './endpoints';
import { apiRequest } from './http';
import { mapDocument, mapHistoryEntry, mapPatient, mapPrescription, mapTask } from './mappers';
import { pickCollection, pickEntity } from './normalize';
import type { HistoryEntry, MedicalTask, Patient, PatientDocument, Prescription } from './types';

/**
 * Активні пацієнти центру. Фільтр застосовується і на сервері (status=active),
 * і локально — щоб виписані пацієнти не потрапляли у список навіть якщо
 * сервер повернув усіх.
 */
export async function fetchPatients(options?: { includeDischarged?: boolean }): Promise<Patient[]> {
  const payload = await apiRequest(endpoints.patients.list, {
    query: options?.includeDischarged ? { limit: 500 } : { status: 'active', limit: 500 },
  });

  const patients = pickCollection(payload, ['patients'])
    .map(mapPatient)
    .filter((item) => item.id);
  if (options?.includeDischarged) return patients;
  return patients.filter((patient) => patient.state !== 'DISCHARGED');
}

export async function fetchPatient(id: string): Promise<Patient> {
  const payload = await apiRequest(endpoints.patients.detail(id));
  return mapPatient(pickEntity(payload, ['patient']));
}

export async function fetchPatientPrescriptions(id: string): Promise<Prescription[]> {
  const payload = await apiRequest(endpoints.patients.prescriptions(id));
  return pickCollection(payload, ['prescriptions', 'treatments']).map(mapPrescription);
}

export async function fetchPatientTasks(id: string): Promise<MedicalTask[]> {
  const payload = await apiRequest(endpoints.patients.tasks(id));
  return pickCollection(payload, ['tasks']).map(mapTask);
}

export async function fetchPatientHistory(id: string): Promise<HistoryEntry[]> {
  const payload = await apiRequest(endpoints.patients.history(id));
  return pickCollection(payload, ['history', 'entries', 'manipulations']).map(mapHistoryEntry);
}

export async function fetchPatientDocuments(id: string): Promise<PatientDocument[]> {
  const payload = await apiRequest(endpoints.patients.documents(id));
  return pickCollection(payload, ['documents', 'files']).map(mapDocument);
}

/** Швидкий локальний пошук за ПІБ, палатою, ліжком та ID. */
export function filterPatients(patients: Patient[], query: string): Patient[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return patients;
  const terms = needle.split(/\s+/);

  return patients.filter((patient) => {
    const haystack = [
      patient.fullName,
      patient.lastName,
      patient.firstName,
      patient.middleName,
      patient.roomNumber ? `палата ${patient.roomNumber}` : undefined,
      patient.bedNumber ? `ліжко ${patient.bedNumber}` : undefined,
      patient.id,
      patient.diagnosis,
    ]
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}
