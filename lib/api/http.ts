import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { endpoints } from './endpoints';
import { ApiError, NetworkError } from './errors';
import { asRecord, readString } from './normalize';
import { tokenStorage } from './tokens';
import { getDeviceMeta } from '@/lib/device';

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Додавати Authorization. За замовчуванням — так. */
  auth?: boolean;
}

let unauthorizedHandler: (() => void) | null = null;

/** Викликається, коли сервер остаточно відкинув сесію (refresh не допоміг). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const queryString = search.toString();
  return queryString.length > 0 ? `${url}?${queryString}` : url;
}

function extractErrorMessage(payload: unknown, status: number): string {
  const record = asRecord(payload);
  const message =
    readString(record, ['error', 'message', 'detail', 'title']) ??
    readString(asRecord(record.error), ['message', 'detail']);
  if (message) return message;
  if (status === 401) return 'Невірний email або пароль';
  if (status === 403) return 'Недостатньо прав для цієї дії';
  if (status === 404) return 'Дані не знайдено на сервері';
  if (status === 423 || status === 429) return 'Акаунт тимчасово заблоковано';
  if (status >= 500) return 'Сервер тимчасово недоступний';
  return 'Не вдалося виконати запит';
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const device = getDeviceMeta();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client': 'rehaflow-mobile',
  };
  if (device) {
    headers['X-Device-Id'] = device.deviceId;
    headers['X-App-Version'] = device.appVersion;
    headers['X-Device-Model'] = device.model;
    headers['X-Device-Os'] = device.osVersion ? `${device.os} ${device.osVersion}` : device.os;
  }
  if (options.auth !== false) {
    const token = await tokenStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await rawFetch(endpoints.auth.refresh, {
      method: 'POST',
      auth: false,
      // Дублюємо ключ у двох стилях для сумісності з наявним бекендом.
      body: { refreshToken, refresh_token: refreshToken, deviceId: getDeviceMeta()?.deviceId },
    });
    if (!response.ok) return false;

    const payload = await parseBody(response);
    const record = asRecord(payload);
    const nested = asRecord(record.data ?? record.session ?? record.tokens);
    const accessToken =
      readString(record, ['accessToken', 'token', 'jwt']) ??
      readString(nested, ['accessToken', 'token', 'jwt']);
    if (!accessToken) return false;

    const nextRefresh =
      readString(record, ['refreshToken']) ?? readString(nested, ['refreshToken']) ?? refreshToken;
    await tokenStorage.save({ accessToken, refreshToken: nextRefresh });
    return true;
  } catch {
    return false;
  }
}

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * Виконує запит до API RehaFlow.
 * Повертає нерозібраний JSON — типізація відбувається в мапперах.
 */
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  let response = await rawFetch(path, options);

  if (response.status === 401 && options.auth !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await rawFetch(path, options);
    } else {
      await tokenStorage.clear();
      unauthorizedHandler?.();
      throw new ApiError('Сесія завершилась. Увійдіть знову', 401, 'SESSION_EXPIRED');
    }
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      readString(asRecord(payload), ['code', 'errorCode']),
      payload,
    );
  }

  return payload;
}
