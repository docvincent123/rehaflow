/**
 * Базова конфігурація підключення до існуючого API вебсистеми RehaFlow.
 *
 * Адресу можна перевизначити змінною середовища EXPO_PUBLIC_REHAFLOW_API_URL
 * (наприклад, для staging-середовища) без зміни коду.
 */
const DEFAULT_BASE_URL = 'https://gregarious-frangollo-24145c.netlify.app/api/baas';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_REHAFLOW_API_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  '',
);

/** Таймаут одного запиту. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** Інтервал м'якого полінгу (fallback, коли realtime-канал недоступний). */
export const POLL_INTERVAL_MS = 12_000;

/** Скільки тримати офлайн-кеш запитів. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Період оновлення "остання активність" пристрою у вебсистемі. */
export const DEVICE_HEARTBEAT_MS = 3 * 60 * 1000;
