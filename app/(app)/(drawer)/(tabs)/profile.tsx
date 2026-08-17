import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
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
import { useShiftQuery } from '@/lib/hooks/useRehaflowData';
import { useShiftActions } from '@/lib/hooks/useShiftActions';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const fromCache = useAuthStore((state) => state.fromCache);
  const signOut = useAuthStore((state) => state.signOut);
  const shiftQuery = useShiftQuery();
  const { begin, finish, pending, error } = useShiftActions();
  const [device, setDevice] = useState<DeviceMeta | null>(getDeviceMeta());
  const [confirm, setConfirm] = useState<'none' | 'logout' | 'shift-start' | 'shift-end'>('none');

  useEffect(() => {
    if (device) return;
    void initDeviceMeta().then(setDevice);
  }, [device]);

  const shift = shiftQuery.data ?? null;

  return (
    <View className="bg-background flex-1">
      <AppHeader title="Профіль" />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        <View className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border p-4">
          <View className="bg-accent h-14 w-14 items-center justify-center rounded-full">
            <Text className="text-accent-foreground text-lg font-bold">{initials(user?.fullName ?? '—')}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-[17px] font-semibold">{user?.fullName ?? 'Профіль недоступний'}</Text>
            <Text className="text-accent text-sm">{user?.role ? ROLE_LABELS[user.role] : 'Роль не визначена сервером'}</Text>
            {user?.email ? <Text className="text-muted text-xs">{user.email}</Text> : null}
          </View>
        </View>

        {fromCache ? <Banner tone="warning" message="Профіль показано з кешу — сервер ще не підтвердив дані" /> : null}
        {user && !user.role ? <Banner tone="warning" message="Сервер не передав роль користувача. Частина функцій недоступна" /> : null}

        <SectionCard title="Дані акаунта">
          <InfoRow label="ID користувача" value={user?.id || '—'} />
          <InfoRow label="Посада" value={user?.position ?? '—'} />
          <InfoRow label="Телефон" value={user?.phone ?? '—'} />
        </SectionCard>

        {canTrackShift(user?.role ?? null) ? (
          <SectionCard title="Зміна">
            <InfoRow label="Початок" value={shift?.startedAt ? formatTime(shift.startedAt) : '—'} />
            <InfoRow label="Кінець" value={shift?.endedAt ? formatTime(shift.endedAt) : '—'} />
            <InfoRow label="Стан" value={shift?.isActive ? 'Зміна триває' : 'Зміна не розпочата'} valueClassName={shift?.isActive ? 'text-state-done' : undefined} />
            {error ? <Banner tone="danger" message={error} className="mt-2" /> : null}
            <Pressable
              disabled={pending !== null}
              onPress={() => setConfirm(shift?.isActive ? 'shift-end' : 'shift-start')}
              className={`mt-3 min-h-12 items-center justify-center rounded-xl px-4 py-3 ${shift?.isActive ? 'border-danger bg-danger/15 border' : 'bg-accent'}`}
            >
              <Text className={`text-sm font-bold ${shift?.isActive ? 'text-danger' : 'text-accent-foreground'}`}>
                {shift?.isActive ? 'Завершити зміну' : 'Почати зміну'}
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        <SectionCard title="Цей пристрій">
          <InfoRow label="Модель" value={device?.model ?? '—'} />
          <InfoRow label="ОС" value={device ? `${device.os}${device.osVersion ? ` ${device.osVersion}` : ''}` : '—'} />
          <InfoRow label="Версія застосунку" value={device?.appVersion ?? '—'} />
          <InfoRow label="Device ID" value={device?.deviceId ?? '—'} />
        </SectionCard>

        {confirm === 'none' ? (
          <Pressable onPress={() => setConfirm('logout')} className="bg-danger/15 min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4">
            <LogOut color={navColors.danger} size={18} />
            <Text className="text-danger text-base font-bold">Вихід</Text>
          </Pressable>
        ) : confirm === 'logout' ? (
          <View className="border-danger/40 bg-danger/10 gap-2 rounded-2xl border p-4">
            <Text className="text-foreground text-sm">Вийти з акаунта на цьому пристрої?</Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => void signOut()} className="bg-danger min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3">
                <Text className="text-danger-foreground text-sm font-bold">Так, вийти</Text>
              </Pressable>
              <Pressable onPress={() => setConfirm('none')} className="border-border min-h-12 flex-1 items-center justify-center rounded-xl border px-4 py-3">
                <Text className="text-foreground text-sm font-medium">Скасувати</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={confirm === 'shift-start' || confirm === 'shift-end'}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm('none')}
      >
        <View className="bg-black/50 flex-1 items-center justify-center px-5">
          <View className="border-border bg-surface w-full max-w-md gap-4 rounded-2xl border p-5">
            <Text className="text-foreground text-lg font-bold">
              {confirm === 'shift-start' ? 'Почати зміну?' : 'Завершити зміну?'}
            </Text>
            <Text className="text-muted text-sm">
              {confirm === 'shift-start'
                ? 'Час початку буде зафіксовано на сервері та стане доступним у вебсистемі.'
                : 'Зміна буде закрита на сервері. Виконані завдання та активність залишаться в історії.'}
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setConfirm('none')} className="border-border min-h-12 flex-1 items-center justify-center rounded-xl border px-4 py-3">
                <Text className="text-foreground text-sm font-medium">Скасувати</Text>
              </Pressable>
              <Pressable
                disabled={pending !== null}
                onPress={() => {
                  const mode = confirm;
                  setConfirm('none');
                  void (mode === 'shift-start' ? begin() : finish());
                }}
                className="bg-accent min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3"
              >
                <Text className="text-accent-foreground text-sm font-bold">Підтвердити</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
