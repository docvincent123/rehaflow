import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react-native';

import { cn } from '@/lib/utils';
import { navColors } from '@/lib/theme';

export function LoadingState({ label = 'Завантаження…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator color={navColors.accent} size="large" />
      <Text className="text-muted text-sm">{label}</Text>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  hint?: string;
}

export function ErrorState({ message, onRetry, hint }: ErrorStateProps) {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <AlertTriangle color={navColors.danger} size={32} />
      <Text className="text-foreground text-center text-base font-semibold">{message}</Text>
      {hint ? <Text className="text-muted text-center text-sm">{hint}</Text> : null}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="bg-accent mt-2 min-h-12 flex-row items-center gap-2 rounded-xl px-5 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <RefreshCw color={navColors.headerForeground} size={16} />
          <Text className="text-accent-foreground text-sm font-semibold">Спробувати знову</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center gap-2 px-6 py-12">
      <Inbox color={navColors.muted} size={30} />
      <Text className="text-foreground text-center text-base font-semibold">{title}</Text>
      {hint ? <Text className="text-muted text-center text-sm">{hint}</Text> : null}
    </View>
  );
}

interface BannerProps {
  tone: 'info' | 'success' | 'danger' | 'warning';
  message: string;
  className?: string;
}

const TONE_CLASSNAMES: Record<BannerProps['tone'], string> = {
  info: 'border-accent/50 bg-accent/15',
  success: 'border-state-done/50 bg-state-done/15',
  danger: 'border-danger/50 bg-danger/15',
  warning: 'border-urgent/50 bg-urgent/15',
};

const TONE_TEXT: Record<BannerProps['tone'], string> = {
  info: 'text-foreground',
  success: 'text-state-done',
  danger: 'text-danger',
  warning: 'text-urgent',
};

export function Banner({ tone, message, className }: BannerProps) {
  return (
    <View className={cn('rounded-xl border px-4 py-3', TONE_CLASSNAMES[tone], className)}>
      <Text className={cn('text-sm font-medium', TONE_TEXT[tone])}>{message}</Text>
    </View>
  );
}
