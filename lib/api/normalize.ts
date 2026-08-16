/**
 * Толерантне читання полів з відповіді API.
 *
 * Вебсистема може віддавати camelCase або snake_case, а колекції — під різними
 * ключами ({ data }, { items }, { patients }, або просто масив). Ці хелпери
 * дозволяють читати реальні дані без жорсткої привʼязки до однієї форми JSON.
 */

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function expandKeys(keys: string[]): string[] {
  const result: string[] = [];
  for (const key of keys) {
    if (!result.includes(key)) result.push(key);
    const snake = toSnakeCase(key);
    if (!result.includes(snake)) result.push(snake);
    const lower = key.toLowerCase();
    if (!result.includes(lower)) result.push(lower);
  }
  return result;
}

export function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of expandKeys(keys)) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function readNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of expandKeys(keys)) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function readBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of expandKeys(keys)) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
  }
  return undefined;
}

export function readRecord(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  for (const key of expandKeys(keys)) {
    const value = record[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

export function readArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of expandKeys(keys)) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/** Дістає масив сутностей з відповіді будь-якої розумної форми. */
export function pickCollection(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const direct = readArray(record, [
    ...keys,
    'data',
    'items',
    'results',
    'rows',
    'list',
    'records',
  ]);
  if (direct.length > 0) return direct;

  // Форма { data: { items: [...] } }
  const nested = readRecord(record, ['data', 'result', 'payload']);
  if (Object.keys(nested).length > 0) {
    return readArray(nested, [...keys, 'items', 'results', 'rows', 'list', 'records']);
  }
  return [];
}

/** Дістає одну сутність з відповіді будь-якої розумної форми. */
export function pickEntity(payload: unknown, keys: string[]): Record<string, unknown> {
  const record = asRecord(payload);
  const direct = readRecord(record, [...keys, 'data', 'item', 'result', 'record']);
  if (Object.keys(direct).length > 0) {
    const deeper = readRecord(direct, keys);
    return Object.keys(deeper).length > 0 ? deeper : direct;
  }
  return record;
}

export function joinName(parts: (string | undefined)[]): string | undefined {
  const value = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim();
  return value.length > 0 ? value : undefined;
}
