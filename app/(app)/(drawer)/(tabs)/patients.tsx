import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { PatientRow } from '@/components/PatientRow';
import { SearchInput } from '@/components/SearchInput';
import { SectionTitle } from '@/components/SectionCard';
import { errorMessage } from '@/lib/api/errors';
import { filterPatients } from '@/lib/api/patients';
import { greeting } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { usePatientsQuery } from '@/lib/hooks/useRehaflowData';

export default function PatientsScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const query = usePatientsQuery();
  const [search, setSearch] = useState('');

  const patients = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => filterPatients(patients, search), [patients, search]);
  const hasData = patients.length > 0;

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Пацієнти" subtitle="Дані з RehaFlow WEB" />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження пацієнтів…" />
      ) : query.isError && !hasData ? (
        <ErrorState
          message={errorMessage(query.error)}
          hint="Не вдалося прочитати пацієнтів із вебсистеми. Перевірте з’єднання та адресу API."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={navColors.accent}
              colors={[navColors.accent]}
            />
          }
          ListHeaderComponent={
            <View className="gap-4 pb-1">
              <Text className="text-foreground text-xl font-bold">
                {greeting()}, {user?.fullName ?? 'колего'}
              </Text>

              <SearchInput
                value={search}
                onChangeText={setSearch}
                placeholder="Пошук: ПІБ, палата, ліжко, ID"
              />

              {query.isError ? (
                <Banner tone="warning" message={`${errorMessage(query.error)}. Показані кешовані дані.`} />
              ) : null}
              {!online && !query.isError ? (
                <Banner tone="warning" message="Офлайн. Показані останні збережені дані." />
              ) : null}

              <SectionTitle>
                {search ? `Знайдено: ${filtered.length}` : `Активні пацієнти (${patients.length})`}
              </SectionTitle>
            </View>
          }
          renderItem={({ item }) => (
            <PatientRow
              patient={item}
              onPress={() => router.push({ pathname: '/patient/[id]', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            search ? (
              <EmptyState title="Нічого не знайдено" hint="Змініть запит пошуку" />
            ) : (
              <EmptyState
                title="Пацієнтів не знайдено"
                hint="Список завантажується з вебсистеми RehaFlow. Потягніть вниз для повторного запиту."
              />
            )
          }
        />
      )}
    </View>
  );
}
