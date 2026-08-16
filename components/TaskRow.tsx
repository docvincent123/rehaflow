import { Pressable, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';

import { PendingSyncPill, StatusPill, UrgentPill } from '@/components/StatusPill';
import { cn } from '@/lib/utils';
import { formatTime, roomBedLine } from '@/lib/format';
import { navColors } from '@/lib/theme';
import type { MedicalTask } from '@/lib/api/types';

interface TaskRowProps {
  task: MedicalTask;
  onPress: () => void;
  pendingSync?: boolean;
}

export function TaskRow({ task, onPress, pendingSync }: TaskRowProps) {
  const isUrgent = task.priority === 'URGENT';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Завдання ${task.title} для ${task.patientName}`}
      onPress={onPress}
      className={cn(
        'min-h-[92px] gap-2 rounded-2xl border px-4 py-3.5',
        isUrgent ? 'border-urgent bg-urgent-soft' : 'border-border bg-surface',
      )}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="text-foreground flex-1 text-base font-semibold" numberOfLines={1}>
          {task.patientName}
        </Text>
        {isUrgent ? <UrgentPill /> : null}
      </View>

      <Text className="text-muted text-[13px]">{roomBedLine(task.roomNumber, task.bedNumber)}</Text>

      <Text className="text-foreground text-[15px] font-medium" numberOfLines={2}>
        {task.title}
      </Text>

      <View className="mt-0.5 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-1.5">
          <Clock color={navColors.muted} size={14} />
          <Text className="text-foreground text-[13px] font-semibold">
            {formatTime(task.scheduledAt)}
          </Text>
        </View>
        <StatusPill status={task.status} />
      </View>

      {task.claimedByName && task.status !== 'COMPLETED' ? (
        <Text className="text-muted text-[12px]">Медсестра: {task.claimedByName}</Text>
      ) : null}

      {pendingSync ? <PendingSyncPill /> : null}
    </Pressable>
  );
}
