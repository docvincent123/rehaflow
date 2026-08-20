import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Clock3, SquarePlay } from 'lucide-react-native';

import { NetworkBar } from '@/components/NetworkBar';
import { QueueNotices } from '@/components/QueueNotices';
import { navColors } from '@/lib/theme';
import { useAuthStatus, useCurrentUser } from '@/lib/store/authStore';
import { canTrackShift } from '@/lib/permissions';
import { useShiftQuery } from '@/lib/hooks/useRehaflowData';
import { useShiftActions } from '@/lib/hooks/useShiftActions';

export default function AppLayout() {
  const status = useAuthStatus();
  const user = useCurrentUser();
  const shift = useShiftQuery();
  const { begin, pending, error } = useShiftActions();
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !canTrackShift(user?.role ?? null) || shift.isLoading) return;
    if (!shift.data?.isActive && !dismissed) setShowShiftPrompt(true);
  }, [status, user?.role, shift.isLoading, shift.data?.isActive, dismissed]);

  if (status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={navColors.accent} size="large" />
      </View>
    );
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  const startShift = async () => {
    await begin();
    setShowShiftPrompt(false);
    setDismissed(false);
  };

  return (
    <View className="bg-background flex-1">
      <View className="bg-header pt-safe" />
      <NetworkBar />
      <QueueNotices />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: navColors.background },
        }}
      />

      <Modal visible={showShiftPrompt} transparent animationType="fade" onRequestClose={() => { setShowShiftPrompt(false); setDismissed(true); }}>
        <View className="flex-1 items-center justify-center bg-black/55 px-5">
          <View className="w-full max-w-md rounded-3xl bg-surface p-6">
            <View className="bg-accent-soft h-14 w-14 items-center justify-center rounded-2xl"><Clock3 color={navColors.accent} size={26} /></View>
            <Text className="text-foreground mt-4 text-xl font-bold">Починаємо робочу зміну?</Text>
            <Text className="text-muted mt-2 text-sm leading-5">При старті зміни ваші завдання та виконані дії будуть прив'язані до сьогоднішньої робочої зміни.</Text>
            {error ? <Text className="text-danger mt-3 text-xs">{error}</Text> : null}
            <View className="mt-5 gap-2">
              <Pressable disabled={pending !== null} onPress={() => void startShift()} className="bg-accent min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"><SquarePlay color={navColors.headerForeground} size={17} /><Text className="text-accent-foreground text-sm font-bold">Розпочати зміну</Text></Pressable>
              <Pressable disabled={pending !== null} onPress={() => { setShowShiftPrompt(false); setDismissed(true); }} className="border-border min-h-12 items-center justify-center rounded-xl border px-4 py-3"><Text className="text-foreground text-sm font-semibold">Не зараз</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
