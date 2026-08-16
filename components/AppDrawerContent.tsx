import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { router } from 'expo-router';
import { useState } from 'react';
import { Clock, LogOut, ShieldOff, Smartphone, SquarePlay, SquareStop } from 'lucide-react-native';

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
  const signOutEverywhere = useAuthStore((state) => state.signOutEverywhere);
  const [confirm, setConfirm] = useState<'none' | 'single' | 'all'>('none');
  const [busy, setBusy] = useState(false);

  const shiftQuery = useShiftQuery();
  const shift = shiftQuery.data ?? null;
  const { begin, finish, pending, error } = useShiftActions();
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'Роль не визначена';

  const go = (path: '/devices' | '/profile') => {
    props.navigation.closeDrawer();
    router.push(path);
  };

  const handleSignOut = async (everywhere: boolean) => {
    setBusy(true);
    try {
      if (everywhere) await signOutEverywhere();
      else await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="bg-background flex-1">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <View className="bg-header px-5 pt-6 pb-5">
          <Text className="text-header-foreground text-xl font-bold">RehaFlow</Text>
          <Text className="text-header-foreground/80 text-[11px]">Мобільний доступ персоналу</Text>
        </View>

        <View className="gap-4 px-4 pt-4">
          <View className="border-border bg-surface flex-row items-center gap-3 rounded-2xl border p-4">
            <View className="bg-accent h-12 w-12 items-center justify-center rounded-full">
              <Text className="text-accent-foreground text-base font-bold">
                {initials(user?.fullName ?? '—')}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-[15px] font-semibold" numberOfLines={2}>
                {user?.fullName ?? 'Профіль недоступний'}
              </Text>
              <Text className="text-accent text-[13px]">{roleLabel}</Text>
              {user?.email ? (
                <Text className="text-muted text-[11px]" numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {canTrackShift(user?.role ?? null) ? (
            <View className="border-border bg-surface gap-3 rounded-2xl border p-4">
              <View className="flex-row items-center gap-2">
                <Clock color={navColors.muted} size={16} />
                <Text className="text-muted text-xs font-bold tracking-wide uppercase">Зміна</Text>
              </View>

              {shiftQuery.isLoading ? (
                <ActivityIndicator color={navColors.accent} />
              ) : (
                <View className="gap-1">
                  <Text className="text-muted text-[13px]">
                    Початок:{' '}
                    <Text className="text-foreground font-semibold">
                      {shift?.startedAt ? formatTime(shift.startedAt) : '—'}
                    </Text>
                  </Text>
                  <Text className="text-muted text-[13px]">
                    Кінець:{' '}
                    <Text className="text-foreground font-semibold">
                      {shift?.endedAt ? formatTime(shift.endedAt) : '—'}
                    </Text>
                  </Text>
                  <Text
                    className={cn(
                      'text-[12px] font-semibold',
                      shift?.isActive ? 'text-state-done' : 'text-muted',
                    )}
                  >
                    {shift?.isActive ? 'Зміна триває' : 'Зміна не розпочата'}
                  </Text>
                </View>
              )}

              {error ? <Banner tone="danger" message={error} /> : null}

              {shift?.isActive ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending !== null}
                  onPress={() => void finish()}
                  className="border-danger bg-danger/15 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
                  style={({ pressed }) => ({ opacity: pressed || pending ? 0.7 : 1 })}
                >
                  <SquareStop color={navColors.danger} size={16} />
                  <Text className="text-danger text-sm font-semibold">Завершити зміну</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending !== null}
                  onPress={() => void begin()}
                  className="bg-accent min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                  style={({ pressed }) => ({ opacity: pressed || pending ? 0.7 : 1 })}
                >
                  <SquarePlay color={navColors.headerForeground} size={16} />
                  <Text className="text-accent-foreground text-sm font-semibold">Почати зміну</Text>
                </Pressable>
              )}
              <Text className="text-muted text-[11px]">
                Час початку та завершення зміни зберігається у вебсистемі RehaFlow
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => go('/devices')}
            className="border-border bg-surface min-h-12 flex-row items-center gap-3 rounded-xl border px-4 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Smartphone color={navColors.muted} size={18} />
            <Text className="text-foreground text-sm font-medium">Підключені пристрої</Text>
          </Pressable>
        </View>
      </DrawerContentScrollView>

      <View className="border-border pb-safe-offset-4 gap-2 border-t px-4 pt-4">
        {confirm === 'single' ? (
          <View className="gap-2">
            <Text className="text-muted text-[13px]">Вийти з акаунта на цьому пристрої?</Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void handleSignOut(false)}
                className="bg-danger min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}
              >
                <Text className="text-danger-foreground text-sm font-bold">Так, вийти</Text>
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
        ) : confirm === 'all' ? (
          <View className="gap-2">
            <Text className="text-muted text-[13px]">
              Завершити сесії на всіх пристроях цього акаунта?
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void handleSignOut(true)}
                className="bg-danger min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}
              >
                <Text className="text-danger-foreground text-sm font-bold">Завершити всі</Text>
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
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('single')}
              className="bg-danger/15 min-h-12 flex-row items-center gap-3 rounded-xl px-4 py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LogOut color={navColors.danger} size={18} />
              <Text className="text-danger text-[15px] font-semibold">Вихід</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirm('all')}
              className="min-h-12 flex-row items-center gap-3 rounded-xl px-4 py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <ShieldOff color={navColors.muted} size={18} />
              <Text className="text-muted text-[13px] font-medium">Вийти з усіх пристроїв</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
