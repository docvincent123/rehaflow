import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, HeartPulse, Users } from 'lucide-react-native';

import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/ScreenState';
import { errorMessage } from '@/lib/api/errors';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { usePatientsQuery, useTasksQuery } from '@/lib/hooks/useRehaflowData';
import { isOpenTask, isWorkingTask } from '@/lib/api/tasks';
import { navColors } from '@/lib/theme';

function StatCard({ icon: Icon, label, value, tint = navColors.accent, onPress }: { icon: any; label: string; value: string; tint?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="border-border bg-surface flex-1 rounded-2xl border p-4" style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}22` }}>
        <Icon color={tint} size={20} />
      </View>
      <Text className="text-muted text-[11px] font-medium">{label}</Text>
      <Text className="text-foreground mt-1 text-2xl font-bold">{value}</Text>
    </Pressable>
  );
}

function ActionCard({ icon: Icon, title, subtitle, onPress }: { icon: any; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border p-4" style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      <View className="bg-accent-soft h-11 w-11 items-center justify-center rounded-xl"><Icon color={navColors.accent} size={20} /></View>
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-sm font-bold">{title}</Text>
        <Text className="text-muted mt-0.5 text-[11px]">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const patients = usePatientsQuery();
  const tasks = useTasksQuery();

  const patientCount = patients.data?.length ?? 0;
  const taskData = tasks.data ?? [];
  const newTasks = useMemo(() => taskData.filter(isOpenTask).length, [taskData]);
  const workingTasks = useMemo(() => taskData.filter(isWorkingTask).length, [taskData]);
  const doneTasks = useMemo(() => taskData.filter((task) => task.status === 'COMPLETED').length, [taskData]);
  const isNurse = user?.role === 'NURSE';

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Робочий центр" subtitle={user?.fullName ?? 'RehaFlow'} />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        {!online ? <Banner tone="warning" message="Офлайн. Показані останні збережені дані, нові дії можуть бути недоступні." /> : null}
        {patients.isError ? <Banner tone="danger" message={`Пацієнти: ${errorMessage(patients.error)}`} /> : null}

        <View className="rounded-3xl bg-header px-5 py-5">
          <Text className="text-header-foreground/80 text-[11px] font-semibold uppercase tracking-widest">Сьогодні</Text>
          <Text className="text-header-foreground mt-1 text-2xl font-bold">{isNurse ? 'Черга медсестри' : 'Робоче місце лікаря'}</Text>
          <Text className="text-header-foreground/80 mt-1 text-xs leading-4">
            {isNurse ? 'Бери вільні завдання, виконуй їх та одразу фіксуй результат.' : 'Переглядай пацієнтів, давай призначення і контролюй виконання.'}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <StatCard icon={Users} label="Активні пацієнти" value={patients.isLoading ? '…' : String(patientCount)} onPress={() => router.push('/patients')} />
          <StatCard icon={ClipboardList} label={isNurse ? 'Нові завдання' : 'Завдання'} value={tasks.isLoading ? '…' : String(newTasks)} tint={navColors.urgent} onPress={() => router.push('/tasks')} />
        </View>
        <View className="flex-row gap-3">
          <StatCard icon={Activity} label="В роботі" value={String(workingTasks)} tint={navColors.success} onPress={() => router.push('/tasks')} />
          <StatCard icon={CheckCircle2} label="Завершено" value={String(doneTasks)} tint={navColors.success} onPress={() => router.push('/tasks')} />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center gap-2 px-1">
            <HeartPulse color={navColors.accent} size={17} />
            <Text className="text-foreground text-base font-bold">Швидкі дії</Text>
          </View>
          {isNurse ? (
            <ActionCard icon={ClipboardList} title="Відкрити чергу" subtitle="Нові завдання від лікарів" onPress={() => router.push('/tasks')} />
          ) : (
            <ActionCard icon={ClipboardList} title="Створити / перевірити призначення" subtitle="Призначення пацієнтам та контроль виконання" onPress={() => router.push('/prescriptions')} />
          )}
          <ActionCard icon={Users} title="Пацієнти" subtitle="Картки, палати, лікарі та історія" onPress={() => router.push('/patients')} />
          <ActionCard icon={Clock3} title="Моя зміна" subtitle="Почати, завершити та переглянути зміну" onPress={() => router.push('/profile')} />
          <ActionCard icon={CalendarDays} title="Історія" subtitle="Події та виконані процедури" onPress={() => router.push('/history')} />
        </View>

        <View className="border-border bg-surface rounded-2xl border p-4">
          <Text className="text-foreground text-sm font-bold">Синхронізація з RehaFlow WEB</Text>
          <Text className="text-muted mt-1 text-[11px] leading-4">
            Пацієнти, призначення, завдання та історія читаються з тієї ж бази, що й вебсистема. Новий APK не потрібен для зміни даних на сайті.
          </Text>
          <View className="mt-3 flex-row items-center gap-2">
            <View className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-success' : 'bg-offline'}`} />
            <Text className="text-foreground text-xs font-semibold">{online ? 'Підключено' : 'Офлайн'}</Text>
            {(patients.isRefetching || tasks.isRefetching) ? <ActivityIndicator color={navColors.accent} size="small" /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
