import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <View className={cn('border-border bg-surface rounded-2xl border p-4', className)}>
      {title ? (
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <Text className="text-muted text-xs font-bold tracking-wide uppercase">{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-1.5">
      <Text className="text-muted flex-1 text-sm">{label}</Text>
      <Text
        className={cn('text-foreground flex-[1.4] text-right text-sm font-medium', valueClassName)}
      >
        {value}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 pb-2">
      <Text className="text-muted text-sm font-bold tracking-wide uppercase">{children}</Text>
      <View className="bg-separator h-px flex-1" />
    </View>
  );
}
