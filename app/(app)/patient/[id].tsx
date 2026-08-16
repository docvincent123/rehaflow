import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { FileText, Plus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { ChipTabs } from '@/components/OptionPicker';
import { HistoryRow } from '@/components/HistoryRow';
import { InfoRow, SectionCard } from '@/components/SectionCard';
import { StatusPill, UrgentPill } from '@/components/StatusPill';
import { canCreatePrescription } from '@/lib/permissions';
import { errorMessage } from '@/lib/api/errors';
import { formalPatientName, formatDate, formatDateTime, formatTime } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { useUserRole } from '@/lib/store/authStore';
import {
  usePatientDocumentsQuery,
  usePatientHistoryQuery,
  usePatientPrescriptionsQuery,
  usePatientQuery,
  usePatientTasksQuery,
} from '@/lib/hooks/useRehaflowData';
import type { HistoryEntry, MedicalTask, PatientDocument, Prescription } from '@/lib/api/types';

type Section = 'info' | 'prescriptions' | 'tasks' | 'done' | 'history' | 'documents';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'info', label: 'Основна інформація' },
  { value: 'prescriptions', label: 'Призначення' },
  { value: 'tasks', label: 'Поточні завдання' },
  { value: 'done', label: 'Виконані процедури' },
  { value: 'history', label: 'Історія' },
  { value: 'documents', label: 'Документи' },
];

type Row =
  | { kind: 'prescription'; item: Prescription }
  | { kind: 'task'; item: MedicalTask }
  | { kind: 'history'; item: HistoryEntry }
  | { kind: 'document'; item: PatientDocument };

export default function PatientCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useUserRole();
  const [section, setSection] = useState<Section>('info');

  const patientQuery = usePatientQuery(id);
  const prescriptionsQuery = usePatientPrescriptionsQuery(
    section === 'prescriptions' ? id : undefined,
  );
  const tasksQuery = usePatientTasksQuery(
    section === 'tasks' || section === 'done' ? id : undefined,
  );
  const historyQuery = usePatientHistoryQuery(section === 'history' ? id : undefined);
  const documentsQuery = usePatientDocumentsQuery(section === 'documents' ? id : undefined);

  const patient = patientQuery.data;

  const rows = useMemo<Row[]>(() => {
    switch (section) {
      case 'prescriptions':
        return (prescriptionsQuery.data ?? []).map((item) => ({ kind: 'prescription', item }));
      case 'tasks':
        return (tasksQuery.data ?? [])
          .filter((task) => task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
          .map((item) => ({ kind: 'task', item }));
      case 'done':
        return (tasksQuery.data ?? [])
          .filter((task) => task.status === 'COMPLETED')
          .map((item) => ({ kind: 'task', item }));
      case 'history':
        return (historyQuery.data ?? []).map((item) => ({ kind: 'history', item }));
      case 'documents':
        return (documentsQuery.data ?? []).map((item) => ({ kind: 'document', item }));
      case 'info':
        return [];
      default:
        return [];
    }
  }, [section, prescriptionsQuery.data, tasksQuery.data, historyQuery.data, documentsQuery.data]);

  const activeQuery =
    section === 'prescriptions'
      ? prescriptionsQuery
      : section === 'tasks' || section === 'done'
        ? tasksQuery
        : section === 'history'
          ? historyQuery
          : section === 'documents'
            ? documentsQuery
            : null;

  if (patientQuery.isLoading && !patient) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Картка пацієнта" leading="back" />
        <LoadingState label="Завантаження картки…" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View className="bg-background flex-1">
        <AppHeader title="Картка пацієнта" leading="back" />
        <ErrorState
          message={errorMessage(patientQuery.error)}
          hint="Дані пацієнта беруться з вебсистеми RehaFlow"
          onRetry={() => void patientQuery.refetch()}
        />
      </View>
    );
  }

  const name = formalPatientName(patient.fullName, patient.lastName);
  const isActive = patient.state === 'ACTIVE';

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Картка пацієнта" leading="back" />

      <FlatList
        data={rows}
        keyExtractor={(row, index) => `${row.kind}-${row.item.id || index}`}
        contentContainerClassName="gap-3 px-4 pb-10"
        ListHeaderComponent={
          <View className="gap-3">
            <View className="gap-2 pt-4">
              <Text className="text-foreground text-[22px] leading-7 font-bold">
                {name.surname}
                {name.rest ? <Text className="font-semibold"> {name.rest}</Text> : null}
              </Text>
              <View className="flex-row flex-wrap gap-x-5 gap-y-1">
                <Text className="text-muted text-sm">
                  Палата:{' '}
                  <Text className="text-foreground font-semibold">{patient.roomNumber ?? '—'}</Text>
                </Text>
                <Text className="text-muted text-sm">
                  Ліжко:{' '}
                  <Text className="text-foreground font-semibold">{patient.bedNumber ?? '—'}</Text>
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive ? 'bg-online' : 'bg-state-cancelled'
                  }`}
                />
                <Text className="text-foreground text-sm font-medium">
                  {isActive ? 'Активний' : 'Неактивний'} — {patient.stateLabel}
                </Text>
              </View>
            </View>

            {canCreatePrescription(role) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/prescription/new',
                    params: { patientId: patient.id },
                  })
                }
                className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Plus color={navColors.headerForeground} size={20} />
                <Text className="text-accent-foreground text-base font-bold">
                  Додати призначення
                </Text>
              </Pressable>
            ) : null}

            <View className="-mx-4">
              <ChipTabs options={SECTIONS} value={section} onChange={setSection} />
            </View>

            {activeQuery?.isError ? (
              <Banner tone="warning" message={errorMessage(activeQuery.error)} />
            ) : null}

            {section === 'info' ? (
              <SectionCard title="Основна інформація">
                <InfoRow label="ПІБ" value={patient.fullName} />
                <InfoRow label="Дата народження" value={formatDate(patient.birthDate)} />
                <InfoRow label="Палата" value={patient.roomNumber ?? '—'} />
                <InfoRow label="Ліжко" value={patient.bedNumber ?? '—'} />
                <InfoRow label="Діагноз" value={patient.diagnosis ?? '—'} />
                <InfoRow label="Лікар" value={patient.doctorName ?? '—'} />
                <InfoRow label="Надходження" value={formatDate(patient.admittedAt)} />
                <InfoRow label="Телефон" value={patient.phone ?? '—'} />
                <InfoRow label="ID пацієнта" value={patient.id} />
                {patient.note ? <InfoRow label="Примітка" value={patient.note} /> : null}
              </SectionCard>
            ) : null}

            {activeQuery?.isLoading && rows.length === 0 ? (
              <LoadingState label="Завантаження…" />
            ) : null}
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'prescription') {
            const prescription = row.item;
            return (
              <View className="border-border bg-surface gap-1.5 rounded-2xl border px-4 py-3.5">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="text-foreground flex-1 text-[15px] font-semibold">
                    {prescription.title}
                  </Text>
                  {prescription.priority === 'URGENT' ? <UrgentPill /> : null}
                </View>
                <Text className="text-muted text-[12px]">
                  {prescription.typeLabel} • {formatDateTime(prescription.scheduledAt)}
                </Text>
                {prescription.details ? (
                  <Text className="text-foreground text-[13px]">{prescription.details}</Text>
                ) : null}
                {prescription.doctorName ? (
                  <Text className="text-muted text-[12px]">
                    Призначив: {prescription.doctorName}
                  </Text>
                ) : null}
                {prescription.status ? <StatusPill status={prescription.status} /> : null}
              </View>
            );
          }

          if (row.kind === 'task') {
            const task = row.item;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
                className="border-border bg-surface gap-1.5 rounded-2xl border px-4 py-3.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="text-foreground flex-1 text-[15px] font-semibold">
                    {task.title}
                  </Text>
                  {task.priority === 'URGENT' ? <UrgentPill /> : null}
                </View>
                <Text className="text-muted text-[12px]">
                  {task.status === 'COMPLETED'
                    ? formatDateTime(task.completedAt ?? task.scheduledAt)
                    : formatTime(task.scheduledAt)}
                </Text>
                {task.claimedByName ? (
                  <Text className="text-muted text-[12px]">Медсестра: {task.claimedByName}</Text>
                ) : null}
                {task.comment ? (
                  <Text className="text-foreground text-[13px]">Коментар: {task.comment}</Text>
                ) : null}
                <StatusPill status={task.status} />
              </Pressable>
            );
          }

          if (row.kind === 'history') {
            return <HistoryRow entry={row.item} />;
          }

          const document = row.item;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={!document.url}
              onPress={() => {
                if (document.url) void Linking.openURL(document.url);
              }}
              className="border-border bg-surface min-h-14 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <FileText color={navColors.accent} size={20} />
              <View className="flex-1">
                <Text className="text-foreground text-[15px] font-medium">{document.name}</Text>
                <Text className="text-muted text-[12px]">
                  {document.typeLabel ?? 'Документ'} • {formatDate(document.createdAt)}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          section === 'info' || activeQuery?.isLoading ? null : <EmptyState title="Даних немає" />
        }
      />
    </View>
  );
}
