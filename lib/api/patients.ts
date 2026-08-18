import { endpoints } from './endpoints';
import { apiRequest } from './http';
import { mapDocument, mapHistoryEntry, mapPatient, mapPrescription, mapTask } from './mappers';
import { asRecord, pickCollection, pickEntity, readRecord } from './normalize';
import type { HistoryEntry, MedicalTask, Patient, PatientDocument, Prescription } from './types';

type DbQueryResponse = {
  data?: unknown;
  meta?: { count?: number };
};

async function fetchPatientsFromWebDb(includeDischarged = false): Promise<Patient[]> {
  const where = includeDischarged
    ? {}
    : {
        status: {
          in: ['active', 'ACTIVE', 'Active', 'лікується', 'in_treatment', 'current'],
        },
      };

  const payload = await apiRequest('/db/query', {
    method: 'POST',
    body: {
      model: 'Patient',
      action: 'findMany',
      args: {
        where,
        orderBy: { admissionDate: 'desc' },
        take: 500,
        include: {
          room: true,
          doctor: true,
          bed: true,
        },
      },
    },
  });

  const response = asRecord(payload) as DbQueryResponse;
  const raw = Array.isArray(response.data) ? response.data : [];
  return raw
    .map((item) => {
      const record = asRecord(item);
      const nested = readRecord(record, ['patient', 'person', 'data']);
      return mapPatient(Object.keys(nested).length > 0 ? nested : record);
    })
    .filter((item) => item.id)
    .filter((item) => includeDischarged || item.state !== 'DISCHARGED');
}

/**
 * IMPORTANT:
 * The web application itself reads patients through /api/baas/db/query.
 * Mobile now reads through the same route first, so WEB and MOBILE cannot
 * silently diverge to different patient stores/endpoints.
 *
 * Existing mobile endpoints remain as fallbacks for backwards compatibility.
 */
export async function fetchPatients(options?: { includeDischarged?: boolean }): Promise<Patient[]> {
  let dbError: unknown = null;

  try {
    const patients = await fetchPatientsFromWebDb(Boolean(options?.includeDischarged));
    if (patients.length > 0 || options?.includeDischarged) return patients;
  } catch (error) {
    dbError = error;
  }

  const queries = options?.includeDischarged
    ? [{ limit: 500 }]
    : [
        { status: 'active', limit: 500 },
        { active: true, limit: 500 },
        { status: 'ACTIVE', limit: 500 },
        { limit: 500 },
      ];

  let lastError: unknown = dbError;

  for (const query of queries) {
    try {
      const payload = await apiRequest(endpoints.patients.list, { query });
      const rawPatients = pickCollection(payload, [
        'patients',
        'activePatients',
        'active_patients',
        'items',
        'data',
        'results',
        'rows',
        'records',
      ]);

      const patients = rawPatients
        .map((item) => {
          const record = asRecord(item);
          const nested = readRecord(record, ['patient', 'person', 'data']);
          return mapPatient(Object.keys(nested).length > 0 ? nested : record);
        })
        .filter((item) => item.id);

      if (options?.includeDischarged) return patients;

      const active = patients.filter((patient) => patient.state !== 'DISCHARGED');
      if (active.length > 0) return active;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return [];
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
