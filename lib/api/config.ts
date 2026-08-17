/** Базова конфігурація підключення до існуючого API вебсистеми RehaFlow. */
const DEFAULT_BASE_URL = 'https://gregarious-frangollo-24145c.netlify.app/api/baas';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_REHAFLOW_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 20_000;
export const POLL_INTERVAL_MS = 12_000;
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Heartbeat is frequent enough for the web admin to show real mobile presence. */
export const DEVICE_HEARTBEAT_MS = 60 * 1000;
