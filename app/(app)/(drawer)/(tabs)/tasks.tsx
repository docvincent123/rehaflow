import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CircleDot, Clock3, Hand, Siren } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner, EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { SegmentedTabs } from '@/components/OptionPicker';
import { TaskRow } from '@/components/TaskRow';
import { errorMessage } from '@/lib/api/errors';
import { claimTask, isMyTask, isOpenTask, isWorkingTask, sortTasks } from '@/lib/api/tasks';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { useOfflineQueueStore } from '@/lib/store/offlineQueue';
import { useTasksQuery } from '@/lib/hooks/useRehaflowData';
import { configureTaskAlerts, ringForNewTask } from '@/lib/notifications/taskAlerts';
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
  if (!splitUrgent) return sorted.map((task) => ({ kind: 'task', id: task.id, task }));
  const urgent = sorted.filter((task) => task.priority === 'URGENT');
  const normal = sorted.filter((task) => task.priority !== 'URGENT');
  const rows: Row[] = [];
  if (urgent.length) {
    rows.push({ kind: 'header', id: 'urgent', title: `Термінові (${urgent.length})` });
    urgent.forEach((task) => rows.push({ kind: 'task', id: task.id, task }));
  }
  if (normal.length) {
    rows.push({ kind: 'header', id: 'normal', title: `Звичайні (${normal.length})` });
    normal.forEach((task) => rows.push({ kind: 'task', id: task.id, task }));
  }
  return rows;
}

export default function TasksScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const query = useTasksQuery();
  const queuedActions = useOfflineQueueStore((state) => state.actions);
  const [tab, setTab] = useState<TaskTab>('new');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const seenTaskIds = useRef<Set<string>>(new Set());

  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const isNurse = user?.role === 'NURSE';

  useEffect(() => {
    if (!isNurse) return;
    void configureTaskAlerts();
  }, [isNurse]);

  useEffect(() => {
    if (!isNurse || tasks.length === 0) return;
    const open = tasks.filter(isOpenTask);
    const firstLoad = seenTaskIds.current.size === 0;
    const fresh = open.filter((task) => !seenTaskIds.current.has(task.id));
    open.forEach((task) => seenTaskIds.current.add(task.id));
    if (firstLoad || fresh.length === 0) return;

    const newest = sortTasks(fresh)[0];
    setAlertMessage(
      newest.priority === 'URGENT'
        ? `Термінове: ${newest.patientName} · ${newest.title}`
        : `Нове завдання: ${newest.patientName} · ${newest.title}`,
    );
    void ringForNewTask(newest);
  }, [isNurse, tasks]);

  const pendingTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const action of queuedActions) {
      if (action.kind !== 'CREATE_PRESCRIPTION') ids.add(action.taskId);
    }
    return ids;
  }, [queuedActions]);

  const groups = useMemo(() => {
    const open = tasks.filter(isOpenTask);
    const working = tasks.filter((task) => isWorkingTask(task) && (!isNurse || isMyTask(task, user?.id)));
    const done = tasks.filter((task) => task.status === 'COMPLETED');
    return { new: open, working, done };
  }, [tasks, isNurse, user?.id]);

  const rows = useMemo(() => buildRows(groups[tab], tab === 'new'), [groups, tab]);
  const hasData = tasks.length > 0;

  const quickClaim = async (task: MedicalTask) => {
    if (!isNurse || claiming) return;
    setClaiming(task.id);
    try {
      await claimTask(task.id);
      setAlertMessage(`Завдання для ${task.patientName} закріплено за вами`);
      await query.refetch();
    } catch (error) {
      setAlertMessage(errorMessage(error));
      await query.refetch();
    } finally {
      setClaiming(null);
    }
  };

  return (
    <View className="bg-background flex-1">
      <AppHeader title={isNurse ? 'Черга медсестри' : 'Медичні завдання'} subtitle={isNurse ? 'Хто перший взяв — той виконує' : user?.fullName} />

      <View className="mx-4 mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-success" />
            <Text className="text-foreground text-sm font-bold">Черга в реальному часі</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock3 color={navColors.muted} size={15} />
            <Text className="text-muted text-[11px]">оновлення ~12 с</Text>
          </View>
        </View>
        <Text className="text-muted px-4 pb-3 text-[11px]">
          {isNurse ? 'Нове завдання приходить зі звуком. Вільна медсестра може взяти його однією кнопкою.' : 'Лікар задає роботу — медсестра отримує її в мобільній черзі та бачить пацієнта, час і пріоритет.'}
        </Text>
      </View>

      {alertMessage ? (
        <Pressable onPress={() => setAlertMessage(null)} className="mx-4 mt-3 rounded-2xl border border-urgent bg-urgent-soft px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-urgent/15"><BellRing color={navColors.urgent} size={21} /></View>
            <View className="min-w-0 flex-1">
              <Text className="text-foreground text-sm font-bold">Оповіщення</Text>
              <Text className="text-muted mt-0.5 text-xs" numberOfLines={2}>{alertMessage}</Text>
            </View>
            <Text className="text-urgent text-[10px] font-bold">ЗАКРИТИ</Text>
          </View>
        </Pressable>
      ) : null}

      <SegmentedTabs options={TAB_OPTIONS} value={tab} onChange={setTab} counts={{ new: groups.new.length, working: groups.working.length }} />

      {query.isLoading && !hasData ? (
        <LoadingState label="Завантаження черги…" />
      ) : query.isError && !hasData ? (
        <ErrorState message={errorMessage(query.error)} hint="Завдання надходять з єдиного API RehaFlow." onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerClassName="gap-3 px-4 pb-8 pt-4"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={navColors.accent} colors={[navColors.accent]} />}
          ListHeaderComponent={
            <View className="gap-2">
              {query.isError || !online ? <Banner tone="warning" message={query.isError ? `${errorMessage(query.error)}. Показані збережені дані` : 'Офлайн. Показані збережені дані'} /> : null}
              {isNurse && groups.new.length > 0 ? (
                <View className="flex-row items-center gap-2 rounded-xl bg-accent-soft px-3 py-2">
                  <CircleDot color={navColors.accent} size={15} />
                  <Text className="text-accent flex-1 text-xs font-semibold">{groups.new.length} завдань чекають на вільну медсестру</Text>
                  <Siren color={navColors.urgent} size={15} />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => item.kind === 'header' ? (
            <View className="flex-row items-center gap-2 pt-1">
              <View className={`h-2.5 w-2.5 rounded-full ${item.id === 'urgent' ? 'bg-offline' : 'bg-state-created'}`} />
              <Text className="text-muted text-sm font-bold tracking-wide uppercase">{item.title}</Text>
            </View>
          ) : (
            <View className="gap-2">
              <TaskRow task={item.task} pendingSync={pendingTaskIds.has(item.task.id)} onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.task.id } })} />
              {isNurse && isOpenTask(item.task) ? (
                <Pressable accessibilityRole="button" disabled={claiming !== null} onPress={() => void quickClaim(item.task)} className="bg-accent min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3" style={({ pressed }) => ({ opacity: pressed || claiming ? 0.75 : 1 })}>
                  <Hand color={navColors.headerForeground} size={17} />
                  <Text className="text-accent-foreground text-sm font-bold">{claiming === item.task.id ? 'Закріплення…' : 'ВЗЯТИ ЗАВДАННЯ'}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState title={tab === 'new' ? 'Нових завдань немає' : tab === 'working' ? 'Немає завдань у роботі' : 'Завершених завдань немає'} hint={tab === 'new' ? 'Нові призначення лікаря зʼявляться тут автоматично' : undefined} />}
        />
      )}
    </View>
  );
}
