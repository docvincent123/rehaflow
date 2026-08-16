import { endpoints } from './endpoints';
import { ApiError } from './errors';
import { apiRequest } from './http';
import { mapUser } from './mappers';
import { asRecord, pickEntity, readString } from './normalize';
import { tokenStorage } from './tokens';
import type { User } from './types';
import { getDeviceMeta } from '@/lib/device';

export interface LoginResult {
  accessToken: string;
  refreshToken: string | null;
  user: User | null;
}

function extractTokens(payload: unknown): { accessToken?: string; refreshToken?: string } {
  const record = asRecord(payload);
  const nested = asRecord(record.data ?? record.session ?? record.tokens ?? record.auth);
  return {
    accessToken:
      readString(record, ['accessToken', 'token', 'jwt', 'idToken']) ??
      readString(nested, ['accessToken', 'token', 'jwt', 'idToken']),
    refreshToken: readString(record, ['refreshToken']) ?? readString(nested, ['refreshToken']),
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const device = getDeviceMeta();
  const payload = await apiRequest(endpoints.auth.login, {
    method: 'POST',
    auth: false,
    body: {
      email: email.trim().toLowerCase(),
      password,
      client: 'mobile',
      deviceId: device?.deviceId,
      device: device
        ? {
            deviceId: device.deviceId,
            model: device.model,
            os: device.osVersion ? `${device.os} ${device.osVersion}` : device.os,
            appVersion: device.appVersion,
          }
        : undefined,
    },
  });

  const { accessToken, refreshToken } = extractTokens(payload);
  if (!accessToken) {
    throw new ApiError('Сервер не повернув токен доступу', 500, 'NO_ACCESS_TOKEN', payload);
  }

  const record = asRecord(payload);
  const userRecord = pickEntity(record.user ?? record.profile ?? record.account ?? payload, [
    'user',
    'profile',
    'account',
  ]);
  const user = Object.keys(userRecord).length > 0 ? mapUser(userRecord) : null;

  return { accessToken, refreshToken: refreshToken ?? null, user };
}

export async function fetchMe(): Promise<User> {
  const payload = await apiRequest(endpoints.auth.me);
  return mapUser(pickEntity(payload, ['user', 'profile', 'account']));
}

export async function logout(): Promise<void> {
  const device = getDeviceMeta();
  try {
    await apiRequest(endpoints.auth.logout, {
      method: 'POST',
      body: { deviceId: device?.deviceId },
    });
  } finally {
    await tokenStorage.clear();
  }
}

export async function logoutAllDevices(): Promise<void> {
  try {
    await apiRequest(endpoints.auth.logoutAll, { method: 'POST', body: {} });
  } finally {
    await tokenStorage.clear();
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest(endpoints.auth.forgotPassword, {
    method: 'POST',
    auth: false,
    body: { email: email.trim().toLowerCase() },
  });
}
