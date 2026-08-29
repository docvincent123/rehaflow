import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Activity, CheckCircle2, ClipboardList, HeartPulse, Users } from 'lucide-react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/ScreenState';
import { errorMessage } from '@/lib/api/errors';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { usePatientsQuery, useTasksQuery } from '@/lib/hooks/useRehaflowData';
import { isOpenTask, isWorkingTask } from '@/lib/api/tasks';
import { navColors } from '@/lib/theme';

function StatCard({ icon: Icon, label, value, tint = navColors.accent, onPress }: { icon: any; label: string; value: string; tint?: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} className="border-border bg-surface flex-1 rounded-2xl border p-4" style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}><View className="mb-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}22` }}><Icon color={tint} size={20} /></View><Text className="text-muted text-[11px] font-medium">{label}</Text><Text className="text-foreground mt-1 text-2xl font-bold">{value}</Text></Pressable>;
}

export default function HomeScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const patients = usePatientsQuery();
  const tasks = useTasksQuery();
  const patientCount = patients.data?.length ?? 0;
  const taskData = tasks.data ?? [];
  const canWork = user?.role === 'NURSE' || user?.role === 'REHAB_SPECIALIST';
  const roleName = user?.role === 'REHAB_SPECIALIST' ? 'реабілітолога' : 'медсестри';
  const newTasks = useMemo(() => taskData.filter((task) => isOpenTask(task) && (!task.targetRole || task.targetRole === user?.role)).length, [taskData, user?.role]);
  const workingTasks = useMemo(() => taskData.filter((task) => isWorkingTask(task) && (!canWork || task.claimedById === user?.id)).length, [taskData, canWork, user?.id]);
  const doneTasks = useMemo(() => taskData.filter((task) => task.status === 'COMPLETED' && (!canWork || task.claimedById === user?.id)).length, [taskData, canWork, user?.id]);
  const urgentTasks = useMemo(() => taskData.filter((task) => isOpenTask(task) && task.priority === 'URGENT' && (!task.targetRole || task.targetRole === user?.role)).length, [taskData, user?.role]);

  return <View className="bg-background flex-1"><AppHeader title="Огляд" subtitle={user?.fullName ?? 'RehaFlow'} /><ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4" showsVerticalScrollIndicator={false}>
    {!online ? <Banner tone="warning" message="Офлайн. Показані останні збережені дані." /> : null}
    {patients.isError ? <Banner tone="danger" message={`Пацієнти: ${errorMessage(patients.error)}`} /> : null}
    <View className="rounded-3xl bg-header px-5 py-5"><Text className="text-header-foreground/80 text-[11px] font-semibold uppercase tracking-widest">RehaFlow</Text><Text className="text-header-foreground mt-1 text-2xl font-bold">{canWork ? `Робоче місце ${roleName}` : 'Робоче місце лікаря'}</Text><Text className="text-header-foreground/80 mt-1 text-xs leading-4">{canWork ? 'Пацієнти, завдання та виконання в одному екрані.' : 'Пацієнти та призначення з контролем виконання.'}</Text></View>
    <View className="flex-row gap-3"><StatCard icon={Users} label="Активні пацієнти" value={patients.isLoading ? '…' : String(patientCount)} onPress={() => router.push('/patients')} /><StatCard icon={ClipboardList} label={canWork ? 'Нові завдання' : 'Призначення'} value={tasks.isLoading ? '…' : String(newTasks)} tint={navColors.urgent} onPress={() => router.push(canWork ? '/tasks' : '/prescriptions')} /></View>
    {canWork ? <View className="flex-row gap-3"><StatCard icon={Activity} label="В роботі" value={String(workingTasks)} tint={navColors.success} onPress={() => router.push('/tasks')} /><StatCard icon={CheckCircle2} label="Виконано" value={String(doneTasks)} tint={navColors.success} onPress={() => router.push('/tasks')} /></View> : null}
    <Pressable onPress={() => router.push(canWork ? '/tasks' : '/prescriptions')} className="border-border bg-surface rounded-2xl border p-4" style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}><View className="flex-row items-center gap-2"><HeartPulse color={navColors.accent} size={18} /><Text className="text-foreground flex-1 text-base font-bold">Стан роботи</Text><Text className="text-accent text-xs font-bold">Відкрити</Text></View><Text className="text-muted mt-2 text-xs">{canWork ? (newTasks ? `${newTasks} нових${urgentTasks ? ` · ${urgentTasks} термінових` : ''}` : 'Нових завдань немає') : `${newTasks} активних призначень`}</Text></Pressable>
    <View className="border-border bg-surface rounded-2xl border p-4"><Text className="text-foreground text-sm font-bold">Стан синхронізації</Text><View className="mt-2 flex-row items-center gap-2"><View className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-success' : 'bg-offline'}`} /><Text className="text-foreground text-xs font-semibold">{online ? 'Система онлайн' : 'Немає підключення'}</Text>{(patients.isRefetching || tasks.isRefetching) ? <ActivityIndicator color={navColors.accent} size="small" /> : null}</View></View>
  </ScrollView></View>;
}
