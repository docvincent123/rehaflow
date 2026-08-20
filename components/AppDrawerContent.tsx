import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { useState } from 'react';
import { Clock, LogOut, QrCode, Settings, SquarePlay, SquareStop, UserRound, History } from 'lucide-react-native';

import { Banner } from '@/components/ScreenState';
import { cn } from '@/lib/utils';
import { formatTime, initials } from '@/lib/format';
import { navColors } from '@/lib/theme';
import { ROLE_LABELS } from '@/lib/api/types';
import { canTrackShift } from '@/lib/permissions';
import { useAuthStore, useCurrentUser } from '@/lib/store/authStore';
import { useShiftQuery } from '@/lib/hooks/useRehaflowData';
import { useShiftActions } from '@/lib/hooks/useShiftActions';

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const user = useCurrentUser();
  const signOut = useAuthStore((state) => state.signOut);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const shiftQuery = useShiftQuery();
  const shift = shiftQuery.data ?? null;
  const { begin, finish, pending, error } = useShiftActions();
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'Роль не визначена';

  const go = (path: '/profile' | '/settings' | '/history' | '/qr') => {
    props.navigation.closeDrawer();
    router.push(path as never);
  };

  const handleSignOut = async () => {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); }
  };

  return (
    <View className="bg-background flex-1">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <View className="bg-header px-5 pt-6 pb-5">
          <Text className="text-header-foreground text-xl font-bold">RehaFlow</Text>
          <Text className="text-header-foreground/80 text-[11px]">Мобільна система центру</Text>
        </View>

        <View className="gap-4 px-4 pt-4">
          <Pressable onPress={() => go('/profile')} className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border p-4">
            <View className="bg-accent h-12 w-12 items-center justify-center rounded-full">
              <Text className="text-accent-foreground text-base font-bold">{initials(user?.fullName ?? '—')}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-[15px] font-semibold" numberOfLines={2}>{user?.fullName ?? 'Профіль недоступний'}</Text>
              <Text className="text-accent text-[13px]">{roleLabel}</Text>
              {user?.email ? <Text className="text-muted text-[11px]" numberOfLines={1}>{user.email}</Text> : null}
            </View>
            <UserRound color={navColors.muted} size={18} />
          </Pressable>

          {canTrackShift(user?.role ?? null) ? (
            <View className="border-border bg-surface gap-3 rounded-2xl border p-4">
              <View className="flex-row items-center gap-2"><Clock color={navColors.muted} size={16} /><Text className="text-muted text-xs font-bold tracking-wide uppercase">Робоча зміна</Text></View>
              {shiftQuery.isLoading ? <ActivityIndicator color={navColors.accent} /> : (
                <View className="gap-1">
                  <Text className="text-muted text-[13px]">Початок: <Text className="text-foreground font-semibold">{shift?.startedAt ? formatTime(shift.startedAt) : '—'}</Text></Text>
                  <Text className="text-muted text-[13px]">Кінець: <Text className="text-foreground font-semibold">{shift?.endedAt ? formatTime(shift.endedAt) : '—'}</Text></Text>
                  <Text className={cn('text-[12px] font-semibold', shift?.isActive ? 'text-state-done' : 'text-muted')}>{shift?.isActive ? 'Зміна триває' : 'Зміна не розпочата'}</Text>
                </View>
              )}
              {error ? <Banner tone="danger" message={error} /> : null}
              {shift?.isActive ? (
                <Pressable disabled={pending !== null} onPress={() => void finish()} className="border-danger bg-danger/15 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"><SquareStop color={navColors.danger} size={16} /><Text className="text-danger text-sm font-semibold">Завершити зміну</Text></Pressable>
              ) : (
                <Pressable disabled={pending !== null} onPress={() => void begin()} className="bg-accent min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"><SquarePlay color={navColors.headerForeground} size={16} /><Text className="text-accent-foreground text-sm font-semibold">Розпочати зміну</Text></Pressable>
              )}
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-muted px-1 text-[11px] font-bold uppercase tracking-wide">Швидкі дії</Text>
            <Pressable onPress={() => go('/qr')} className="border-border bg-surface min-h-12 flex-row items-center gap-3 rounded-xl border px-4 py-3"><QrCode color={navColors.accent} size={18} /><Text className="text-foreground text-sm font-semibold">Сканувати QR ліжка</Text></Pressable>
            <Pressable onPress={() => go('/history')} className="border-border bg-surface min-h-12 flex-row items-center gap-3 rounded-xl border px-4 py-3"><History color={navColors.muted} size={18} /><Text className="text-foreground text-sm font-medium">Історія роботи</Text></Pressable>
            <Pressable onPress={() => go('/settings')} className="border-border bg-surface min-h-12 flex-row items-center gap-3 rounded-xl border px-4 py-3"><Settings color={navColors.muted} size={18} /><Text className="text-foreground text-sm font-medium">Налаштування</Text></Pressable>
          </View>
        </View>
      </DrawerContentScrollView>

      <View className="border-border pb-safe-offset-4 gap-2 border-t px-4 pt-4">
        {!confirm ? (
          <Pressable onPress={() => setConfirm(true)} className="bg-danger/15 min-h-12 flex-row items-center gap-3 rounded-xl px-4 py-3"><LogOut color={navColors.danger} size={18} /><Text className="text-danger text-[15px] font-semibold">Вихід</Text></Pressable>
        ) : (
          <View className="gap-2">
            <Text className="text-muted text-[13px]">Вийти з акаунта на цьому пристрої?</Text>
            <View className="flex-row gap-2">
              <Pressable disabled={busy} onPress={() => void handleSignOut()} className="bg-danger min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3"><Text className="text-danger-foreground text-sm font-bold">Так, вийти</Text></Pressable>
              <Pressable onPress={() => setConfirm(false)} className="border-border min-h-12 flex-1 items-center justify-center rounded-xl border px-4 py-3"><Text className="text-foreground text-sm font-medium">Скасувати</Text></Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
