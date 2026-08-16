import { Text, View } from 'react-native';
import { CloudOff, Wifi, WifiOff } from 'lucide-react-native';

import { cn } from '@/lib/utils';
import { navColors } from '@/lib/theme';
import { useIsOnline } from '@/lib/store/networkStore';
import { usePendingActionCount } from '@/lib/store/offlineQueue';

/**
 * Постійний індикатор з'єднання у верхній частині застосунку.
 * При втраті інтернету застосунок не закривається і не виходить з акаунта.
 */
export function NetworkBar() {
  const online = useIsOnline();
  const pending = usePendingActionCount();

  return (
    <View className={cn('w-full', online ? 'bg-header' : 'bg-offline')}>
      <View className="flex-row items-center gap-2 px-4 py-1.5">
        {online ? (
          <Wifi color={navColors.headerForeground} size={14} />
        ) : (
          <WifiOff color={navColors.headerForeground} size={14} />
        )}
        <View
          className={cn('h-2 w-2 rounded-full', online ? 'bg-online' : 'bg-header-foreground')}
        />
        <Text className="text-header-foreground text-xs font-semibold">
          {online ? 'Онлайн' : 'Немає з’єднання'}
        </Text>

        {pending > 0 ? (
          <View className="ml-auto flex-row items-center gap-1.5">
            <CloudOff color={navColors.headerForeground} size={13} />
            <Text className="text-header-foreground text-[11px]">Очікує надсилання: {pending}</Text>
          </View>
        ) : null}
      </View>

      {online ? null : (
        <View className="px-4 pb-1.5">
          <Text className="text-header-foreground text-[11px]">
            Немає з’єднання з сервером. Показані збережені дані
          </Text>
        </View>
      )}
    </View>
  );
}
