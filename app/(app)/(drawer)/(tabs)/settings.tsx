import { Pressable, ScrollView, Text, View } from 'react-native';
import { Bell, LogOut, RefreshCw, ShieldCheck, Smartphone, Wifi } from 'lucide-react-native';
import { router } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/ScreenState';
import { SectionCard, InfoRow } from '@/components/SectionCard';
import { navColors } from '@/lib/theme';
import { useCurrentUser } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { useShiftQuery } from '@/lib/hooks/useRehaflowData';
import { useAuthStore } from '@/lib/store/authStore';

const roleLabels: Record<string, string> = {
  DOCTOR: 'Лікар',
  NURSE: 'Медична сестра',
  ADMIN: 'Адміністратор',
};

export default function SettingsScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const shift = useShiftQuery();
  const signOut = useAuthStore((state) => state.signOut);

  const logout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Налаштування" subtitle="RehaFlow Mobile" />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        {!online ? <Banner tone="warning" message="Офлайн. Дані можуть бути неактуальні." /> : null}

        <SectionCard title="Мій профіль">
          <InfoRow label="Імʼя" value={user?.fullName ?? '—'} />
          <InfoRow label="Роль" value={roleLabels[user?.role ?? ''] ?? user?.role ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Телефон" value={user?.phone ?? '—'} />
        </SectionCard>

        <SectionCard title="Робочий стан">
          <InfoRow label="Інтернет" value={online ? 'Онлайн' : 'Офлайн'} />
          <InfoRow label="Зміна" value={shift.data?.isActive ? 'Відкрита' : 'Закрита'} />
          {shift.data?.startedAt ? <InfoRow label="Початок зміни" value={new Date(shift.data.startedAt).toLocaleString('uk-UA')} /> : null}
          <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3">
            <Wifi color={online ? navColors.success : navColors.danger} size={18} />
            <View className="flex-1">
              <Text className="text-foreground text-sm font-semibold">Синхронізація з WEB</Text>
              <Text className="text-muted mt-0.5 text-[11px]">Пацієнти та робочі дані читаються з єдиної системи</Text>
            </View>
            <RefreshCw color={navColors.accent} size={18} />
          </View>
        </SectionCard>

        <SectionCard title="Сповіщення">
          <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
            <Bell color={navColors.urgent} size={19} />
            <View className="flex-1">
              <Text className="text-foreground text-sm font-semibold">Нові завдання</Text>
              <Text className="text-muted mt-0.5 text-[11px]">Гучні сповіщення для термінових завдань медсестер</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Безпека">
          <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
            <ShieldCheck color={navColors.success} size={19} />
            <View className="flex-1">
              <Text className="text-foreground text-sm font-semibold">Захищена сесія</Text>
              <Text className="text-muted mt-0.5 text-[11px]">Активні сесії та керування пристроями залишаються доступними адміністратору тільки у WEB</Text>
            </View>
          </View>
        </SectionCard>

        <Pressable
          onPress={() => void logout()}
          className="border border-danger/30 bg-danger/10 min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <LogOut color={navColors.danger} size={19} />
          <Text className="text-danger text-base font-bold">Вийти з акаунта</Text>
        </Pressable>

        <Text className="text-muted text-center text-[10px]">RehaFlow Mobile • для лікарів та медичних сестер</Text>
      </ScrollView>
    </View>
  );
}
