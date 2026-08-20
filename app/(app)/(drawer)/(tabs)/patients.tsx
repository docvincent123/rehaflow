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
  const [scope, setScope] = useState<PatientScope>('all');

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
      <AppHeader title={user?.role === 'NURSE' ? 'Мої пацієнти' : 'Пацієнти'} subtitle={user?.role === 'NURSE' ? 'Закріплені та доступні пацієнти' : 'Активні пацієнти'} />
      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження пацієнтів…" />
      ) : query.isError && !hasData ? (
        <ErrorState message={errorMessage(query.error)} hint="Не вдалося завантажити список пацієнтів." onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={navColors.accent} colors={[navColors.accent]} />}
          ListHeaderComponent={
            <View className="gap-3 pb-1">
              <SearchInput value={search} onChangeText={setSearch} placeholder="Пошук за ПІБ, палатою, ліжком або ID" />
              {user?.role === 'NURSE' ? (
                <View className="flex-row gap-2">
                  <Pressable onPress={() => setScope('mine')} className={`min-h-10 flex-1 items-center justify-center rounded-xl border ${scope === 'mine' ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}>
                    <Text className={`text-xs font-bold ${scope === 'mine' ? 'text-accent' : 'text-foreground'}`}>Мої ({myPatientIds.size})</Text>
                  </Pressable>
                  <Pressable onPress={() => setScope('all')} className={`min-h-10 flex-1 items-center justify-center rounded-xl border ${scope === 'all' ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}>
                    <Text className={`text-xs font-bold ${scope === 'all' ? 'text-accent' : 'text-foreground'}`}>Усі ({patients.length})</Text>
                  </Pressable>
                </View>
              ) : null}
              {query.isError ? <Banner tone="warning" message={`${errorMessage(query.error)}. Показані збережені дані.`} /> : null}
              {!online && !query.isError ? <Banner tone="warning" message="Офлайн. Показаний збережений список." /> : null}
              <SectionTitle>{search ? `Знайдено: ${filtered.length}` : `${scope === 'mine' && user?.role === 'NURSE' ? 'Мої' : 'Активні'} пацієнти · ${filtered.length}`}</SectionTitle>
            </View>
          }
          renderItem={({ item }) => <PatientRow patient={item} onPress={() => router.push({ pathname: '/patient/[id]', params: { id: item.id } })} />}
          ListEmptyComponent={search ? <EmptyState title="Нічого не знайдено" hint="Змініть запит пошуку" /> : scope === 'mine' && user?.role === 'NURSE' ? <EmptyState title="Закріплених пацієнтів немає" hint="Пацієнт з'явиться тут після того, як за вами закріпиться його завдання." /> : <EmptyState title="Пацієнтів не знайдено" hint="Потягніть вниз для повторного оновлення." />}
        />
      )}
    </View>
  );
}
