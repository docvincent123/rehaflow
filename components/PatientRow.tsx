import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { navColors } from '@/lib/theme';
import { roomBedLine } from '@/lib/format';
import type { Patient } from '@/lib/api/types';

interface PatientRowProps {
  patient: Patient;
  onPress: () => void;
}

export function PatientRow({ patient, onPress }: PatientRowProps) {
  const isActive = patient.state === 'ACTIVE';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Пацієнт ${patient.fullName}`}
      onPress={onPress}
      className="border-border bg-surface min-h-[76px] flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="flex-1 gap-1">
        <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
          {patient.fullName}
        </Text>
        <Text className="text-muted text-[13px]">
          {roomBedLine(patient.roomNumber, patient.bedNumber)}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <View
            className={`h-2 w-2 rounded-full ${isActive ? 'bg-online' : 'bg-state-cancelled'}`}
          />
          <Text className="text-muted text-[12px]">Стан: {patient.stateLabel}</Text>
        </View>
      </View>
      <ChevronRight color={navColors.muted} size={20} />
    </Pressable>
  );
}
