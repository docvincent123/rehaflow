import { Text, View } from 'react-native';

import { formatDateTime } from '@/lib/format';
import type { HistoryEntry } from '@/lib/api/types';

/** Запис у розділі "Історія → Медичні маніпуляції". */
export function HistoryRow({ entry, showPatient }: { entry: HistoryEntry; showPatient?: boolean }) {
  return (
    <View className="border-border bg-surface gap-1.5 rounded-2xl border px-4 py-3.5">
      <Text className="text-muted text-[12px] font-semibold">
        {formatDateTime(entry.performedAt)}
      </Text>

      {showPatient && entry.patientName ? (
        <Text className="text-foreground text-[13px] font-medium">{entry.patientName}</Text>
      ) : null}

      <Text className="text-foreground text-[15px] font-semibold">{entry.title}</Text>

      {entry.doctorName ? (
        <Text className="text-muted text-[13px]">Призначив: {entry.doctorName}</Text>
      ) : null}
      {entry.nurseName ? (
        <Text className="text-muted text-[13px]">Виконала: {entry.nurseName}</Text>
      ) : null}

      <View className="flex-row items-center gap-1.5">
        <View className="bg-state-done h-2 w-2 rounded-full" />
        <Text className="text-state-done text-[13px] font-medium">{entry.statusLabel}</Text>
      </View>

      {entry.comment ? (
        <Text className="text-foreground text-[13px]">Коментар: {entry.comment}</Text>
      ) : null}
      {entry.deviceLabel ? (
        <Text className="text-muted text-[11px]">Пристрій: {entry.deviceLabel}</Text>
      ) : null}
    </View>
  );
}
