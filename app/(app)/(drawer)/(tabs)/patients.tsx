import { FlatList, RefreshControl, Text, View, Pressable } from 'react-native';
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
import { usePatientsQuery, useTasksQuery } from '@/lib/hooks/useRehaflowData';

type PatientScope = 'all' | 'mine';

export default function PatientsScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const query = usePatientsQuery();
  const tasksQuery = useTasksQuery();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<PatientScope>(user?.role === 'NURSE' ? 'mine' : 'all');

  const patients = useMemo(() => query.data ?? [], [query.data]);
  const myPatientIds = useMemo(() => {
    if (user?.role !== 'NURSE') return new Set<string>();
    return new Set((tasksQuery.data ?? []).filter((task) => task.claimedById === user.id && task.patientId).map((task) => String(task.patientId)));
  }, [tasksQuery.data, user?.id, user?.role]);

  const scopedPatients = useMemo(() => scope === 'mine' && user?.role === 'NURSE' ? patients.filter((patient) => myPatientIds.has(patient.id)) : patients, [patients, scope, myPatientIds, user?.role]);
  const filtered = useMemo(() => filterPatients(scopedPatients, search), [scopedPatients, search]);
  const hasData = patients.length > 0;

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Пацієнти" subtitle={user?.role === 'NURSE' ? 'Ваші закріплені пацієнти' : 'Дані з RehaFlow WEB'} />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження пацієнтів…" />
      ) : query.isError && !hasData ? (
        <ErrorState message={errorMessage(query.error)} hint="Не вдалося прочитати пацієнтів із вебсистеми. Перевірте з’єднання та адресу API." onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={navColors.accent} colors={[navColors.accent]} />}
          ListHeaderComponent={
            <View className="gap-4 pb-1">
              <Text className="text-foreground text-xl font-bold">{greeting()}, {user?.fullName ?? 'колего'}</Text>
              <SearchInput value={search} onChangeText={setSearch} placeholder="Пошук: ПІБ, палата, ліжко, ID" />
              {user?.role === 'NURSE' ? (
                <View className="flex-row gap-2">
                  {(['mine','all'] as PatientScope[]).map((value) => <Pressable key={value} onPress={() => setScope(value)} className={`min-h-10 flex-1 items-center justify-center rounded-xl border ${scope===value?'border-accent bg-accent-soft':'border-border bg-surface'}`}><Text className={`text-xs font-bold ${scope===value?'text-accent':'text-foreground'}`}>{value==='mine' ? `Мої (${myPatientIds.size})` : `Усі (${patients.length})`}</Text></Pressable>)}
                </View>
              ) : null}
              {query.isError ? <Banner tone="warning" message={`${errorMessage(query.error)}. Показані кешовані дані.`} /> : null}
              {!online && !query.isError ? <Banner tone="warning" message="Офлайн. Показані останні збережені дані." /> : null}
              <SectionTitle>{search ? `Знайдено: ${filtered.length}` : `${scope === 'mine' ? 'Мої пацієнти' : 'Активні пацієнти'} (${filtered.length})`}</SectionTitle>
            </View>
          }
          renderItem={({ item }) => <PatientRow patient={item} onPress={() => router.push({ pathname: '/patient/[id]', params: { id: item.id } })} />}
          ListEmptyComponent={search ? <EmptyState title="Нічого не знайдено" hint="Змініть запит пошуку" /> : scope === 'mine' && user?.role === 'NURSE' ? <EmptyState title="Закріплених пацієнтів немає" hint="Щойно ви візьмете завдання по пацієнту, він з'явиться у цьому списку." /> : <EmptyState title="Пацієнтів не знайдено" hint="Потягніть вниз для повторного запиту." />}
        />
      )}
    </View>
  );
}
