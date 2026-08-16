/** Помилка, яку повернув сервер (є HTTP-статус). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly payload: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

/** Немає з'єднання з сервером (не дійшли до нього взагалі). */
export class NetworkError extends Error {
  constructor(message = 'Немає з’єднання з сервером') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Завдання вже забрала інша медсестра (серверний конфлікт 409). */
export class TaskTakenError extends ApiError {
  readonly claimedByName: string | undefined;

  constructor(message: string, claimedByName?: string, payload?: unknown) {
    super(message, 409, 'TASK_ALREADY_CLAIMED', payload);
    this.name = 'TaskTakenError';
    this.claimedByName = claimedByName;
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/** Текст помилки для показу користувачу — без стектрейсів і технічного жаргону. */
export function errorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'Немає з’єднання з сервером';
  if (error instanceof ApiError) {
    if (error.message) return error.message;
    if (error.status === 401) return 'Сесія завершилась. Увійдіть знову';
    if (error.status === 403) return 'Недостатньо прав для цієї дії';
    if (error.status === 404) return 'Дані не знайдено на сервері';
    if (error.status >= 500) return 'Сервер тимчасово недоступний';
    return 'Не вдалося виконати запит';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Невідома помилка';
}
