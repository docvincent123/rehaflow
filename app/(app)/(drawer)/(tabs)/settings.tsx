import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Bell, LogOut, RefreshCw, ShieldCheck, Volume2, Vibrate, Wifi, LockKeyhole } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppHeader } from '@/components/AppHeader';
import { Banner, SectionCard } from '@/components/ScreenState';
import { InfoRow } from '@/components/SectionCard';
import { navColors } from '@/lib/theme';
import { useCurrentUser, useAuthStore } from '@/lib/store/authStore';
import { useIsOnline } from '@/lib/store/networkStore';
import { useShiftQuery } from '@/lib/hooks/useRehaflowData';

const roleLabels: Record<string, string> = { DOCTOR: 'Лікар', NURSE: 'Медична сестра', ADMIN: 'Адміністратор' };
const SOUND_KEY = '@rehaflow/sound';
const VIBRATION_KEY = '@rehaflow/vibration';
const ALERTS_KEY = '@rehaflow/taskAlerts';
const REFRESH_KEY = '@rehaflow/refreshSeconds';

export default function SettingsScreen() {
  const user = useCurrentUser();
  const online = useIsOnline();
  const shift = useShiftQuery();
  const signOut = useAuthStore((state) => state.signOut);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState('12');

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(SOUND_KEY),
      AsyncStorage.getItem(VIBRATION_KEY),
      AsyncStorage.getItem(ALERTS_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
    ]).then(([s, v, a, r]) => {
      if (s !== null) setSound(s === '1');
      if (v !== null) setVibration(v === '1');
      if (a !== null) setAlerts(a === '1');
      if (r !== null) setRefreshSeconds(r);
    });
  }, []);

  const persist = async (key: string, value: boolean | string) => {
    await AsyncStorage.setItem(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
  };

  const logout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Налаштування" subtitle="Персональні налаштування RehaFlow" />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        {!online ? <Banner tone="warning" message="Офлайн. Дані можуть бути неактуальні." /> : null}

        <SectionCard title="Мій профіль">
          <InfoRow label="Імʼя" value={user?.fullName ?? '—'} />
          <InfoRow label="Роль" value={roleLabels[user?.role ?? ''] ?? user?.role ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Телефон" value={user?.phone ?? '—'} />
        </SectionCard>

        <SectionCard title="Сповіщення та звук">
          <View className="gap-3">
            {[
              ['Нові завдання', 'Повідомляти про нові призначення лікаря', Bell, alerts, setAlerts, ALERTS_KEY],
              ['Звук', 'Сигнал для термінових та нових завдань', Volume2, sound, setSound, SOUND_KEY],
              ['Вібрація', 'Вібрація при важливих сповіщеннях', Vibrate, vibration, setVibration, VIBRATION_KEY],
            ].map(([label, description, Icon, value, setter, key]) => {
              const Component = Icon as typeof Bell;
              return (
                <View key={String(key)} className="border-border bg-surface flex-row items-center gap-3 rounded-xl border px-3 py-3">
                  <Component color={navColors.accent} size={19} />
                  <View className="flex-1"><Text className="text-foreground text-sm font-semibold">{String(label)}</Text><Text className="text-muted mt-0.5 text-[11px]">{String(description)}</Text></View>
                  <Switch value={Boolean(value)} onValueChange={(next) => { (setter as (v: boolean) => void)(next); void persist(String(key), next); }} trackColor={{ false: '#CBD5E1', true: navColors.accent }} />
                </View>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Оновлення даних">
          <View className="border-border bg-surface flex-row items-center gap-3 rounded-xl border px-3 py-3">
            <RefreshCw color={navColors.accent} size={19} />
            <View className="flex-1"><Text className="text-foreground text-sm font-semibold">Автооновлення</Text><Text className="text-muted mt-0.5 text-[11px]">Зараз приблизно кожні {refreshSeconds} секунд</Text></View>
          </View>
          <View className="mt-3 flex-row gap-2">
            {['10','12','20','30'].map((value) => <Pressable key={value} onPress={() => { setRefreshSeconds(value); void persist(REFRESH_KEY, value); }} className={`min-h-10 flex-1 items-center justify-center rounded-lg border ${refreshSeconds===value?'border-accent bg-accent-soft':'border-border bg-surface'}`}><Text className={`text-xs font-bold ${refreshSeconds===value?'text-accent':'text-foreground'}`}>{value}с</Text></Pressable>)}
          </View>
        </SectionCard>

        <SectionCard title="Безпека">
          <View className="border-border bg-surface flex-row items-center gap-3 rounded-xl border px-3 py-3">
            <ShieldCheck color={navColors.success} size={19} />
            <View className="flex-1"><Text className="text-foreground text-sm font-semibold">Захищена сесія</Text><Text className="text-muted mt-0.5 text-[11px]">Керування сесіями та персоналом залишається у WEB для адміністратора.</Text></View>
          </View>
          <View className="mt-3 border-border bg-surface flex-row items-center gap-3 rounded-xl border px-3 py-3"><LockKeyhole color={navColors.muted} size={19} /><View className="flex-1"><Text className="text-foreground text-sm font-semibold">Пароль</Text><Text className="text-muted mt-0.5 text-[11px]">Зміну пароля адміністратор виконує через WEB.</Text></View></View>
        </SectionCard>

        <SectionCard title="Робочий стан">
          <InfoRow label="Інтернет" value={online ? 'Онлайн' : 'Офлайн'} />
          <InfoRow label="Зміна" value={shift.data?.isActive ? 'Відкрита' : 'Закрита'} />
          {shift.data?.startedAt ? <InfoRow label="Початок зміни" value={new Date(shift.data.startedAt).toLocaleString('uk-UA')} /> : null}
          <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3"><Wifi color={online ? navColors.success : navColors.danger} size={18} /><View className="flex-1"><Text className="text-foreground text-sm font-semibold">Синхронізація з WEB</Text><Text className="text-muted mt-0.5 text-[11px]">Єдина база пацієнтів, призначень та завдань</Text></View></View>
        </SectionCard>

        <Pressable onPress={() => void logout()} className="border border-danger/30 bg-danger/10 min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"><LogOut color={navColors.danger} size={19} /><Text className="text-danger text-base font-bold">Вийти з акаунта</Text></Pressable>
        <Text className="text-muted text-center text-[10px]">RehaFlow Mobile • v1.5.678</Text>
      </ScrollView>
    </View>
  );
}
