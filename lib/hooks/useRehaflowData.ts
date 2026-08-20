import { useQuery, useQueryClient } from '@tanstack/react-query';

import { POLL_INTERVAL_MS } from '@/lib/api/config';
import { fetchCurrentShift, fetchDevices } from '@/lib/api/devices';
import { fetchPatient, fetchPatientDocuments, fetchPatientHistory, fetchPatientPrescriptions, fetchPatientTasks } from '@/lib/api/patients';
import { fetchHistory, fetchPrescriptions } from '@/lib/api/prescriptions';
import { fetchTask, fetchTasks } from '@/lib/api/tasks';
import { queryKeys } from '@/lib/query/keys';
import { useIsOnline } from '@/lib/store/networkStore';
import { apiRequest } from '@/lib/api/http';
import { asRecord, pickCollection, readRecord } from '@/lib/api/normalize';
import { mapPatient } from '@/lib/api/mappers';
import type { Patient } from '@/lib/api/types';

async function fetchWebPatients(): Promise<Patient[]> {
  const payload = await apiRequest('/patients/active', {
    client: 'web',
    query: { status: 'active', limit: 500 },
  });
  const rows = pickCollection(payload, ['patients', 'activePatients', 'data', 'items', 'rows', 'records']);
  return rows
    .map((item) => {
      const record = asRecord(item);
      const nested = readRecord(record, ['patient', 'person', 'data']);
      return mapPatient(Object.keys(nested).length > 0 ? nested : record);
    })
    .filter((patient) => patient.id)
    .filter((patient) => {
      const state = String(patient.state ?? patient.status ?? '').trim().toLowerCase();
      return !['discharged', 'inactive', 'archived', 'deleted', 'виписаний', 'виписана', 'виписано', 'неактивний', 'неактивна'].includes(state);
    });
}

async function fetchActivePatientCount(): Promise<number> {
  const payload = await apiRequest('/patients/active', {
    client: 'web',
    query: { status: 'active', limit: 1, offset: 0 },
  });
  const record = asRecord(payload);
  const explicit = Number(record.total ?? record.count ?? record.totalPatients ?? record.activeCount);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const rows = pickCollection(payload, ['patients', 'activePatients', 'data', 'items', 'rows', 'records']);
  return rows.length;
}

export function usePatientsQuery() {
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const patientsQuery = useQuery({
    queryKey: queryKeys.patients,
    queryFn: fetchWebPatients,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useQuery({
    queryKey: ['patients', 'version'],
    queryFn: fetchActivePatientCount,
    enabled: online,
    staleTime: 8_000,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    onSuccess: (count) => {
      const current = queryClient.getQueryData<Patient[]>(queryKeys.patients) ?? [];
      if (count > current.length) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.patients, exact: true });
      }
    },
  });

  return patientsQuery;
}

export function usePatientQuery(id: string | undefined) { return useQuery({ queryKey: queryKeys.patient(id ?? ''), queryFn: () => fetchPatient(id ?? ''), enabled: Boolean(id) }); }
export function usePatientPrescriptionsQuery(id: string | undefined) { return useQuery({ queryKey: queryKeys.patientPrescriptions(id ?? ''), queryFn: () => fetchPatientPrescriptions(id ?? ''), enabled: Boolean(id) }); }
export function usePatientTasksQuery(id: string | undefined) { return useQuery({ queryKey: queryKeys.patientTasks(id ?? ''), queryFn: () => fetchPatientTasks(id ?? ''), enabled: Boolean(id) }); }
export function usePatientHistoryQuery(id: string | undefined) { return useQuery({ queryKey: queryKeys.patientHistory(id ?? ''), queryFn: () => fetchPatientHistory(id ?? ''), enabled: Boolean(id) }); }
export function usePatientDocumentsQuery(id: string | undefined) { return useQuery({ queryKey: queryKeys.patientDocuments(id ?? ''), queryFn: () => fetchPatientDocuments(id ?? ''), enabled: Boolean(id) }); }

export function useTasksQuery() {
  const online = useIsOnline();
  return useQuery({ queryKey: queryKeys.tasks, queryFn: fetchTasks, refetchInterval: online ? POLL_INTERVAL_MS : false, refetchIntervalInBackground: false, staleTime: 5_000 });
}
export function useTaskQuery(id: string | undefined) {
  const online = useIsOnline();
  return useQuery({ queryKey: queryKeys.task(id ?? ''), queryFn: () => fetchTask(id ?? ''), enabled: Boolean(id), refetchInterval: online ? POLL_INTERVAL_MS : false, refetchIntervalInBackground: false });
}
export function usePrescriptionsQuery() { return useQuery({ queryKey: queryKeys.prescriptions, queryFn: fetchPrescriptions, staleTime: 30_000 }); }
export function useHistoryQuery() { return useQuery({ queryKey: queryKeys.history, queryFn: fetchHistory, staleTime: 30_000 }); }
export function useDevicesQuery() { return useQuery({ queryKey: queryKeys.devices, queryFn: fetchDevices, staleTime: 30_000 }); }
export function useShiftQuery() { return useQuery({ queryKey: queryKeys.shift, queryFn: fetchCurrentShift, staleTime: 30_000 }); }
