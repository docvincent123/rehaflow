import * as Application from 'expo-application';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'rehaflow.device-id';

export interface DeviceMeta {
  deviceId: string;
  model: string;
  os: string;
  osVersion: string | undefined;
  appVersion: string;
  label: string;
}

let cached: DeviceMeta | null = null;

function randomId(): string {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let index = 0; index < 32; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
    if (index === 7 || index === 11 || index === 15 || index === 19) out += '-';
  }
  return out;
}

function webBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Веб-клієнт';
  const agent = navigator.userAgent;
  if (agent.includes('Edg/')) return 'Edge (веб)';
  if (agent.includes('Chrome/')) return 'Chrome (веб)';
  if (agent.includes('Firefox/')) return 'Firefox (веб)';
  if (agent.includes('Safari/')) return 'Safari (веб)';
  return 'Веб-клієнт';
}

function resolveModel(): string {
  if (Platform.OS === 'web') return webBrowserName();
  const brand = Device.brand ?? Device.manufacturer ?? undefined;
  const model = Device.modelName ?? Device.deviceName ?? undefined;
  if (brand && model && !model.toLowerCase().startsWith(brand.toLowerCase())) {
    return `${brand} ${model}`;
  }
  return model ?? brand ?? 'Мобільний пристрій';
}

function resolveAppVersion(): string {
  const native = Platform.OS === 'web' ? null : Application.nativeApplicationVersion;
  return native ?? Constants.expoConfig?.version ?? '1.0.0';
}

/** Створює або читає стабільний ідентифікатор пристрою. */
export async function initDeviceMeta(): Promise<DeviceMeta> {
  if (cached) return cached;

  let deviceId: string | null = null;
  try {
    deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  } catch {
    deviceId = null;
  }
  if (!deviceId) {
    deviceId = randomId();
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch {
      // Не критично: у межах сесії id все одно стабільний.
    }
  }

  const os = Platform.OS === 'web' ? 'Web' : (Device.osName ?? Platform.OS);
  const osVersion = Platform.OS === 'web' ? undefined : (Device.osVersion ?? undefined);
  const model = resolveModel();

  cached = {
    deviceId,
    model,
    os,
    osVersion,
    appVersion: resolveAppVersion(),
    label: osVersion ? `${model} • ${os} ${osVersion}` : `${model} • ${os}`,
  };
  return cached;
}

export function getDeviceMeta(): DeviceMeta | null {
  return cached;
}

export function getDeviceId(): string | undefined {
  return cached?.deviceId;
}
