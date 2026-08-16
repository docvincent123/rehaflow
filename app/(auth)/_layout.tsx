import { Redirect, Stack } from 'expo-router';

import { navColors } from '@/lib/theme';
import { useAuthStatus } from '@/lib/store/authStore';

export default function AuthLayout() {
  const status = useAuthStatus();

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: navColors.background },
      }}
    />
  );
}
