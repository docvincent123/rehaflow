import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { SegmentedTabs } from '@/components/OptionPicker';
import { TaskRow } from '@/components/TaskRow';
import { errorMessage } from '@/lib/api/errors';
import { isMyTask, isOpenTask, isWorkingTask, sortTasks } from '@/lib/api/tasks';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { useOfflineQueueStore } from '@/lib/store/offlineQueue';
import { useTasksQuery } from '@/lib/hooks/useRehaflowData';
import type { MedicalTask } from '@/lib/api/types';

type TaskTab = 'new' | 'working' | 'done';

const TAB_OPTIONS: { value: TaskTab; label: string }[] = [
  { value: 'new', label: 'Нові' },
  { value: 'working', label: 'В роботі' },
  { value: 'done', label: 'Завершені' },
];

type Row =
  | { kind: 'header'; id: string; title: string }
  | { kind: 'task'; id: string; task: MedicalTask };

function buildRows(tasks: MedicalTask[], splitUrgent: boolean): Row[] {
  const sorted = sortTasks(tasks);
  if (!splitUrgent) {
    return sorted.map((task) => ({ kind: 'task', id: task.id, task }));
  }

  const urgent = sorted.filter((task) => task.priority === 'URGENT');
  const normal = sorted.filter((task) => task.priority !== 'URGENT');
  const rows: Row[] = [];
  if (urgent.length > 0) {
    rows.push({ kind: 'header', id: 'urgent', title: `Термінові (${urgent.length})` });
    for (const task of urgent) rows.push({ kind: 'task', id: task.id, task });
  }
  if (normal.length > 0) {
    rows.push({ kind: 'header', id: 'normal', title: `Звичайні (${normal.length})` });
    for (const task of normal) rows.push({ kind: 'task', id: task.id, task });
  }
  return rows;
}

export default function TasksScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const query = useTasksQuery();
  const queuedActions = useOfflineQueueStore((state) => state.actions);
  const [tab, setTab] = useState<TaskTab>('new');

  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const isNurse = user?.role === 'NURSE';

  const pendingTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const action of queuedActions) {
      if (action.kind !== 'CREATE_PRESCRIPTION') ids.add(action.taskId);
    }
    return ids;
  }, [queuedActions]);

  const groups = useMemo(() => {
    const open = tasks.filter(isOpenTask);
    const working = tasks.filter(
      (task) => isWorkingTask(task) && (!isNurse || isMyTask(task, user?.id)),
    );
    const done = tasks.filter((task) => task.status === 'COMPLETED');
    return { new: open, working, done };
  }, [tasks, isNurse, user?.id]);

  const rows = useMemo(() => buildRows(groups[tab], tab === 'new'), [groups, tab]);
  const hasData = tasks.length > 0;

  return (
    <View className="bg-background flex-1">
      <AppHeader title={isNurse ? 'Мої завдання' : 'Медичні завдання'} subtitle={user?.fullName} />

      <SegmentedTabs
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        counts={{ new: groups.new.length, working: groups.working.length }}
      />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження завдань…" />
      ) : query.isError && !hasData ? (
        <ErrorState
          message={errorMessage(query.error)}
          hint="Завдання надходять з вебсистеми RehaFlow."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
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
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <View className="flex-row items-center gap-2 pt-1">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${
                    item.id === 'urgent' ? 'bg-offline' : 'bg-state-created'
                  }`}
                />
                <Text className="text-muted text-sm font-bold tracking-wide uppercase">
                  {item.title}
                </Text>
              </View>
            ) : (
              <TaskRow
                task={item.task}
                pendingSync={pendingTaskIds.has(item.task.id)}
                onPress={() =>
                  router.push({ pathname: '/task/[id]', params: { id: item.task.id } })
                }
              />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title={
                tab === 'new'
                  ? 'Нових завдань немає'
                  : tab === 'working'
                    ? 'Немає завдань у роботі'
                    : 'Завершених завдань немає'
              }
              hint={
                tab === 'new' ? 'Нові призначення лікарів зʼявляться тут автоматично' : undefined
              }
            />
          }
        />
      )}
    </View>
  );
}
