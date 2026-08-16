import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }], 'react-native-maps']
      : [];

  return {
    ...config,
    name: 'RehaFlow',
    slug: 'rehaflow',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: 'rehaflow',
    runtimeVersion: { policy: 'appVersion' },
    assetBundlePatterns: ['**/*'],
    icon: './public/icons/icon-512.png',
    ios: {
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.rehaflow.mobile',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.rehaflow.mobile',
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'POST_NOTIFICATIONS', 'VIBRATE'],
      adaptiveIcon: {
        foregroundImage: './public/icons/icon-512-maskable.png',
        backgroundColor: '#0F1620',
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      ['expo-notifications', { color: '#1E88E5' }],
      ...nativePlugins,
    ],
    experiments: { typedRoutes: true, reactCompiler: true },
  };
};
