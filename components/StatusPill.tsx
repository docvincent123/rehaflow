import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';
import { taskStatusMeta } from '@/lib/format';
import type { TaskStatus } from '@/lib/api/types';

interface StatusPillProps {
  status: TaskStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const meta = taskStatusMeta(status);
  return (
    <View
      className={cn(
        'bg-background/40 flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1',
        meta.chipClassName,
        className,
      )}
    >
      <View className={cn('h-2 w-2 rounded-full', meta.dotClassName)} />
      <Text className={cn('text-[11px] font-semibold', meta.textClassName)}>{meta.label}</Text>
    </View>
  );
}

export function UrgentPill({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'bg-urgent flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1',
        className,
      )}
    >
      <Text className="text-urgent-foreground text-[11px] font-bold">ТЕРМІНОВЕ</Text>
    </View>
  );
}

export function PendingSyncPill({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'border-state-created/60 self-start rounded-full border px-2.5 py-1',
        className,
      )}
    >
      <Text className="text-state-created text-[11px] font-semibold">
        Очікує надсилання на сервер
      </Text>
    </View>
  );
}
