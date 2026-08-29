// oxlint-disable-next-line eslint-plugin-import/no-unassigned-import
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, Platform, View } from 'react-native';
import { type ReactNode, useEffect } from 'react';
import { HeroUINativeProvider } from 'heroui-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';
import {
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
  SplashScreen,
  Stack,
} from 'expo-router';

import { CACHE_MAX_AGE_MS } from '@/lib/api/config';
import { initPostHog } from '@/lib/posthog';
import { navColors } from '@/lib/theme';
import { queryClient, queryPersister } from '@/lib/query/client';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { reportErrorToParent } from '@/lib/reportPreviewError';
import { useAppSync } from '@/lib/hooks/useAppSync';
import { useAuthStore } from '@/lib/store/authStore';

function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && error) {
      const message = [error.message, error.stack].filter(Boolean).join('\n');
      reportErrorToParent(message);
    }
  }, [error]);
  return <ExpoErrorBoundary error={error} retry={retry} />;
}

export { ErrorBoundary };

Uniwind.setTheme('dark');
void SplashScreen.preventAutoHideAsync();

function AppBootstrap({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  useAppSync();
  useEffect(() => { void hydrate(); }, [hydrate]);
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack ?? event.message ?? 'Unknown error';
      reportErrorToParent(message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message = err instanceof Error ? [err.message, err.stack].filter(Boolean).join('\n') : String(err);
      reportErrorToParent(message);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const existingLink = document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    }
  }, []);

  useEffect(() => {
    // Expo Go does not provide the dev-client menu; only use it in a native
    // development build. Kept intentionally dependency-free so Expo Go can run.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (__DEV__ && Platform.OS !== 'web' && !isExpoGo) return undefined;
    return undefined;
  }, []);

  useEffect(() => { if (Platform.OS === 'web') initPostHog(); }, []);
  useEffect(() => { registerServiceWorker(); }, []);
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);

  if (!loaded && !error) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: navColors.background }}><ActivityIndicator color={navColors.accent} /></View>;
  }

  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: navColors.background }}>
    <HeroUINativeProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE_MS }}>
        <AppBootstrap>
          <StatusBar style="light" backgroundColor={navColors.header} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: navColors.background } }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </AppBootstrap>
      </PersistQueryClientProvider>
    </HeroUINativeProvider>
  </GestureHandlerRootView>;
}
