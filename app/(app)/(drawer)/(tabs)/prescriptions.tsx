import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatusPill, UrgentPill } from '@/components/StatusPill';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, roomBedLine } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { useIsOnline } from '@/lib/store/networkStore';
import { usePrescriptionsQuery } from '@/lib/hooks/useRehaflowData';

export default function PrescriptionsScreen() {
  const query = usePrescriptionsQuery();
  const online = useIsOnline();
  const prescriptions = query.data ?? [];
  const hasData = prescriptions.length > 0;

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Призначення" subtitle="Створені призначення та їх стан" />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження призначень…" />
      ) : query.isError && !hasData ? (
        <ErrorState
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
          hint="Призначення синхронізуються з вебсистемою RehaFlow."
        />
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item, index) => item.id || `prescription-${index}`}
          contentContainerClassName="gap-3 px-4 pb-8 pt-4"
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
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/prescription/new')}
                className="bg-accent min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Plus color={navColors.headerForeground} size={20} />
                <Text className="text-accent-foreground text-base font-bold">
                  Додати призначення
                </Text>
              </Pressable>

              {query.isError ? (
                <Banner
                  tone="warning"
                  message={`${errorMessage(query.error)}. Показані збережені дані`}
                />
              ) : null}
              {!online && !query.isError ? (
                <Banner tone="warning" message="Офлайн. Показані збережені дані" />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View className="border-border bg-surface gap-1.5 rounded-2xl border px-4 py-3.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="text-foreground flex-1 text-[15px] font-semibold">
                  {item.patientName ?? 'Пацієнт'}
                </Text>
                {item.priority === 'URGENT' ? <UrgentPill /> : null}
              </View>
              <Text className="text-muted text-[13px]">
                {roomBedLine(item.roomNumber, item.bedNumber)}
              </Text>
              <Text className="text-foreground text-[15px]">{item.title}</Text>
              <Text className="text-muted text-[12px]">
                {item.typeLabel} • {formatDateTime(item.scheduledAt)}
              </Text>
              {item.status ? <StatusPill status={item.status} className="mt-1" /> : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Призначень ще немає"
              hint="Натисніть «Додати призначення», щоб створити перше"
            />
          }
        />
      )}
    </View>
  );
}
