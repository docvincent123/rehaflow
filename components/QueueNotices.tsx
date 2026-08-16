import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { cn } from '@/lib/utils';
import { navColors } from '@/lib/theme';
import { useOfflineQueueStore } from '@/lib/store/offlineQueue';

/**
 * Результати відкладених дій після відновлення зв'язку.
 * Успіх показуємо лише тоді, коли сервер реально підтвердив операцію.
 */
export function QueueNotices() {
  const notices = useOfflineQueueStore((state) => state.notices);
  const dismiss = useOfflineQueueStore((state) => state.dismissNotice);

  if (notices.length === 0) return null;

  return (
    <View className="gap-2 px-4 pt-3">
      {notices.map((notice) => (
        <View
          key={notice.id}
          className={cn(
            'flex-row items-center gap-3 rounded-xl border px-3 py-2.5',
            notice.tone === 'success'
              ? 'border-state-done/50 bg-state-done/15'
              : 'border-danger/50 bg-danger/15',
          )}
        >
          <Text
            className={cn(
              'flex-1 text-[13px] font-medium',
              notice.tone === 'success' ? 'text-state-done' : 'text-danger',
            )}
          >
            {notice.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрити повідомлення"
            hitSlop={10}
            onPress={() => dismiss(notice.id)}
          >
            <X color={navColors.muted} size={16} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
