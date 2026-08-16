import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Smartphone } from 'lucide-react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { errorMessage } from '@/lib/api/errors';
import { formatLastSeen } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { useDevicesQuery } from '@/lib/hooks/useRehaflowData';

export default function DevicesScreen() {
  const query = useDevicesQuery();
  const devices = query.data ?? [];

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Підключені пристрої" leading="back" />

      {query.isLoading && devices.length === 0 ? (
        <LoadingState label="Завантаження пристроїв…" />
      ) : query.isError && devices.length === 0 ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item, index) => item.deviceId || `device-${index}`}
          contentContainerClassName="gap-3 px-4 pb-10 pt-4"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={navColors.accent}
              colors={[navColors.accent]}
            />
          }
          ListHeaderComponent={
            <View className="gap-3">
              <Text className="text-muted text-sm">
                Ці пристрої відображаються біля акаунта у вебсистемі RehaFlow.
              </Text>
              {query.isError ? <Banner tone="warning" message={errorMessage(query.error)} /> : null}
            </View>
          }
          renderItem={({ item }) => (
            <View className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border px-4 py-3.5">
              <Smartphone color={item.isCurrent ? navColors.accent : navColors.muted} size={22} />
              <View className="flex-1">
                <Text className="text-foreground text-[15px] font-semibold">{item.model}</Text>
                <Text className="text-muted text-[12px]">
                  {[item.os, item.appVersion ? `версія ${item.appVersion}` : null]
                    .filter(Boolean)
                    .join(' • ') || 'Дані пристрою відсутні'}
                </Text>
                <Text className="text-muted text-[12px]">
                  Остання активність: {formatLastSeen(item.lastSeenAt)}
                </Text>
              </View>
              {item.isCurrent ? (
                <View className="bg-accent rounded-full px-2.5 py-1">
                  <Text className="text-accent-foreground text-[10px] font-bold">ЦЕЙ</Text>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Активних пристроїв немає"
              hint="Пристрій реєструється автоматично після входу"
            />
          }
        />
      )}
    </View>
  );
}
