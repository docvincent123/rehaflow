import { FlatList, RefreshControl, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { HistoryRow } from '@/components/HistoryRow';
import { errorMessage } from '@/lib/api/errors';
import { navColors } from '@/lib/theme';
import { useHistoryQuery } from '@/lib/hooks/useRehaflowData';
import { useIsOnline } from '@/lib/store/networkStore';

export default function HistoryScreen() {
  const query = useHistoryQuery();
  const online = useIsOnline();
  const entries = query.data ?? [];
  const hasData = entries.length > 0;

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Історія" subtitle="Виконані медичні маніпуляції" />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження історії…" />
      ) : query.isError && !hasData ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.id || `history-${index}`}
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
            query.isError || !online ? (
              <Banner
                tone="warning"
                message={
                  query.isError
                    ? `${errorMessage(query.error)}. Показані збережені дані`
                    : 'Офлайн. Показані збережені дані'
                }
              />
            ) : null
          }
          renderItem={({ item }) => <HistoryRow entry={item} showPatient />}
          ListEmptyComponent={
            <EmptyState
              title="Історія порожня"
              hint="Тут зʼявляться виконані завдання з датою, виконавцем і коментарем"
            />
          }
        />
      )}
    </View>
  );
}
