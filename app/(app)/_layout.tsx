import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { NetworkBar } from '@/components/NetworkBar';
import { QueueNotices } from '@/components/QueueNotices';
import { navColors } from '@/lib/theme';
import { useAuthStatus } from '@/lib/store/authStore';

export default function AppLayout() {
  const status = useAuthStatus();

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

  return (
    <View className="bg-background flex-1">
      {/* Смуга статус-бару у колірі верхньої панелі */}
      <View className="bg-header pt-safe" />
      <NetworkBar />
      <QueueNotices />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: navColors.background },
        }}
      />
    </View>
  );
}
