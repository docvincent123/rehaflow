import { useQuery } from '@tanstack/react-query';

import { POLL_INTERVAL_MS } from '@/lib/api/config';
import { fetchDevices, fetchCurrentShift } from '@/lib/api/devices';
import { fetchPatient, fetchPatientDocuments, fetchPatientHistory, fetchPatientPrescriptions, fetchPatientTasks, fetchPatients } from '@/lib/api/patients';
import { fetchHistory, fetchPrescriptions } from '@/lib/api/prescriptions';
import { fetchTask, fetchTasks } from '@/lib/api/tasks';
import { queryKeys } from '@/lib/query/keys';
import { useIsOnline } from '@/lib/store/networkStore';

export function usePatientsQuery() {
  const online = useIsOnline();
  return useQuery({
    queryKey: queryKeys.patients,
    queryFn: () => fetchPatients(),
    refetchInterval: online ? 10_000 : false,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
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
