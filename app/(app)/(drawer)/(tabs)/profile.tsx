import { Pressable, ScrollView, Text, View } from 'react-native';
import { LogOut, ShieldOff, Smartphone } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/ScreenState';
import { InfoRow, SectionCard } from '@/components/SectionCard';
import { ROLE_LABELS } from '@/lib/api/types';
import { canTrackShift } from '@/lib/permissions';
import { formatTime, initials } from '@/lib/format';
import { getDeviceMeta, initDeviceMeta, type DeviceMeta } from '@/lib/device';
import { navColors } from '@/lib/theme';
import { useAuthStore, useCurrentUser } from '@/lib/store/authStore';
import { useDevicesQuery, useShiftQuery } from '@/lib/hooks/useRehaflowData';
import { useShiftActions } from '@/lib/hooks/useShiftActions';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const fromCache = useAuthStore((state) => state.fromCache);
  const signOut = useAuthStore((state) => state.signOut);
  const signOutEverywhere = useAuthStore((state) => state.signOutEverywhere);
  const devicesQuery = useDevicesQuery();
  const shiftQuery = useShiftQuery();
  const { begin, finish, pending, error } = useShiftActions();
  const [device, setDevice] = useState<DeviceMeta | null>(getDeviceMeta());
  const [confirm, setConfirm] = useState<'none' | 'single' | 'all'>('none');

  useEffect(() => {
    if (device) return;
    void initDeviceMeta().then(setDevice);
  }, [device]);

  const shift = shiftQuery.data ?? null;
  const activeDevices = devicesQuery.data ?? [];

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Профіль" />

      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        <View className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border p-4">
          <View className="bg-accent h-14 w-14 items-center justify-center rounded-full">
            <Text className="text-accent-foreground text-lg font-bold">
              {initials(user?.fullName ?? '—')}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-[17px] font-semibold">
              {user?.fullName ?? 'Профіль недоступний'}
            </Text>
            <Text className="text-accent text-sm">
              {user?.role ? ROLE_LABELS[user.role] : 'Роль не визначена сервером'}
            </Text>
            {user?.email ? <Text className="text-muted text-xs">{user.email}</Text> : null}
          </View>
        </View>

        {fromCache ? (
          <Banner tone="warning" message="Профіль показано з кешу — сервер ще не підтвердив дані" />
        ) : null}
        {user && !user.role ? (
          <Banner
            tone="warning"
            message="Сервер не передав роль користувача. Частина функцій недоступна"
          />
        ) : null}

        <SectionCard title="Дані акаунта">
          <InfoRow label="ID користувача" value={user?.id || '—'} />
          <InfoRow label="Посада" value={user?.position ?? '—'} />
          <InfoRow label="Телефон" value={user?.phone ?? '—'} />
        </SectionCard>

        {canTrackShift(user?.role ?? null) ? (
          <SectionCard title="Зміна">
            <InfoRow label="Початок" value={shift?.startedAt ? formatTime(shift.startedAt) : '—'} />
            <InfoRow label="Кінець" value={shift?.endedAt ? formatTime(shift.endedAt) : '—'} />
            <InfoRow
              label="Стан"
              value={shift?.isActive ? 'Зміна триває' : 'Зміна не розпочата'}
              valueClassName={shift?.isActive ? 'text-state-done' : undefined}
            />
            {error ? <Banner tone="danger" message={error} className="mt-2" /> : null}
            <Pressable
              accessibilityRole="button"
              disabled={pending !== null}
              onPress={() => void (shift?.isActive ? finish() : begin())}
              className={`mt-3 min-h-12 items-center justify-center rounded-xl px-4 py-3 ${
                shift?.isActive ? 'border-danger bg-danger/15 border' : 'bg-accent'
              }`}
              style={({ pressed }) => ({ opacity: pressed || pending ? 0.75 : 1 })}
            >
              <Text
                className={`text-sm font-bold ${
                  shift?.isActive ? 'text-danger' : 'text-accent-foreground'
                }`}
              >
                {shift?.isActive ? 'Завершити зміну' : 'Почати зміну'}
              </Text>
            </Pressable>
            <Text className="text-muted mt-2 text-[11px]">
              Час зміни зберігається у вебсистемі RehaFlow
            </Text>
          </SectionCard>
        ) : null}

        <SectionCard title="Цей пристрій">
          <InfoRow label="Модель" value={device?.model ?? '—'} />
          <InfoRow
            label="ОС"
            value={device ? `${device.os}${device.osVersion ? ` ${device.osVersion}` : ''}` : '—'}
          />
          <InfoRow label="Версія застосунку" value={device?.appVersion ?? '—'} />
          <InfoRow label="Device ID" value={device?.deviceId ?? '—'} />
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/devices')}
          className="border-border bg-surface min-h-14 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Smartphone color={navColors.accent} size={20} />
          <Text className="text-foreground flex-1 text-[15px] font-medium">
            Підключені пристрої
          </Text>
          <Text className="text-accent text-sm font-semibold">{activeDevices.length}</Text>
        </Pressable>

        {confirm === 'none' ? (
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('single')}
              className="bg-danger/15 min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LogOut color={navColors.danger} size={18} />
              <Text className="text-danger text-base font-bold">Вихід</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('all')}
              className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <ShieldOff color={navColors.muted} size={16} />
              <Text className="text-muted text-sm font-medium">Вийти з усіх пристроїв</Text>
            </Pressable>
          </View>
        ) : (
          <View className="border-danger/40 bg-danger/10 gap-2 rounded-2xl border p-4">
            <Text className="text-foreground text-sm">
              {confirm === 'single'
                ? 'Вийти з акаунта на цьому пристрої?'
                : 'Завершити сесії на всіх пристроях цього акаунта?'}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => void (confirm === 'single' ? signOut() : signOutEverywhere())}
                className="bg-danger min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-danger-foreground text-sm font-bold">Підтвердити</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirm('none')}
                className="border-border min-h-12 flex-1 items-center justify-center rounded-xl border px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-foreground text-sm font-medium">Скасувати</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
