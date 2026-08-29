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
  requiresTwoFactor?: boolean;
  challengeToken?: string | null;
}

function mapMobileUser(input: unknown): User {
  const user = mapUser(input);
  if (user.role) return user;
  const record = asRecord(input);
  const rawRole = readString(record, ['role', 'userRole', 'type', 'position', 'jobTitle', 'specialty']);
  if (rawRole && /(rehab|rehabilitation|реаб|фізіотерап|physio|кінезі|кінезіт)/i.test(rawRole)) {
    user.role = 'REHAB_SPECIALIST';
  }
  return user;
}

function extractTokens(payload: unknown): { accessToken?: string; refreshToken?: string } {
  const record = asRecord(payload);
  const nested = asRecord(record.data ?? record.session ?? record.tokens ?? record.auth);
  return {
    accessToken: readString(record, ['accessToken', 'token', 'jwt', 'idToken']) ?? readString(nested, ['accessToken', 'token', 'jwt', 'idToken']),
    refreshToken: readString(record, ['refreshToken', 'refresh_token']) ?? readString(nested, ['refreshToken', 'refresh_token']),
  };
}

export async function login(emailOrLogin: string, password: string): Promise<LoginResult> {
  const identifier = emailOrLogin.trim();
  const device = getDeviceMeta();
  if (!identifier || !password) throw new ApiError('Введіть логін та пароль', 400, 'MISSING_CREDENTIALS');
  const payload = await apiRequest(endpoints.auth.login, {
    method: 'POST', auth: false,
    body: {
      email: identifier.toLowerCase(), login: identifier, username: identifier, identifier, password,
      client: 'mobile', deviceId: device?.deviceId,
      device: device ? { deviceId: device.deviceId, name: device.model, model: device.model, os: device.osVersion ? `${device.os} ${device.osVersion}` : device.os, platform: device.os, appVersion: device.appVersion } : undefined,
    },
  });
  const record = asRecord(payload);
  const requiresTwoFactor = record.requiresTwoFactor === true;
  const challengeToken = readString(record, ['challengeToken']);
  if (requiresTwoFactor) return { accessToken: '', refreshToken: null, user: null, requiresTwoFactor: true, challengeToken: challengeToken ?? null };
  const { accessToken, refreshToken } = extractTokens(payload);
  if (!accessToken) throw new ApiError('Сервер не повернув токен доступу', 500, 'NO_ACCESS_TOKEN', payload);
  await tokenStorage.save({ accessToken, refreshToken: refreshToken ?? accessToken });
  const userRecord = pickEntity(record.user ?? record.profile ?? record.account ?? payload, ['user', 'profile', 'account']);
  let user = Object.keys(userRecord).length > 0 ? mapMobileUser(userRecord) : null;
  try { user = await fetchMe(); } catch { /* Authentication succeeded; /me may be temporarily unavailable. */ }
  return { accessToken, refreshToken: refreshToken ?? accessToken, user };
}

export async function fetchMe(): Promise<User> {
  const payload = await apiRequest(endpoints.auth.me);
  return mapMobileUser(pickEntity(payload, ['user', 'profile', 'account']));
}

export async function logout(): Promise<void> {
  const device = getDeviceMeta();
  try { await apiRequest(endpoints.auth.logout, { method: 'POST', body: { deviceId: device?.deviceId } }); }
  finally { await tokenStorage.clear(); }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest(endpoints.auth.forgotPassword, { method: 'POST', auth: false, body: { email: email.trim().toLowerCase() } });
}
