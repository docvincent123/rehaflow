import { format, isValid, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

import type { Priority, TaskStatus } from '@/lib/api/types';

export function toDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function formatDateTime(value: string | undefined | null): string {
  const date = toDate(value);
  return date ? format(date, 'dd.MM.yyyy HH:mm', { locale: uk }) : '—';
}

export function formatDate(value: string | undefined | null): string {
  const date = toDate(value);
  return date ? format(date, 'dd.MM.yyyy', { locale: uk }) : '—';
}

export function formatTime(value: string | undefined | null): string {
  const date = toDate(value);
  return date ? format(date, 'HH:mm', { locale: uk }) : '—';
}

export function formatLastSeen(value: string | undefined | null): string {
  const date = toDate(value);
  if (!date) return 'невідомо';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'щойно';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 2) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  return formatDateTime(value);
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброї ночі';
  if (hour < 12) return 'Доброго ранку';
  if (hour < 18) return 'Добрий день';
  return 'Добрий вечір';
}

export interface StatusMeta {
  label: string;
  dotClassName: string;
  textClassName: string;
  chipClassName: string;
}

const STATUS_META: Record<TaskStatus, StatusMeta> = {
  CREATED: {
    label: 'Нове',
    dotClassName: 'bg-state-created',
    textClassName: 'text-state-created',
    chipClassName: 'border-state-created/50',
  },
  AVAILABLE: {
    label: 'Нове',
    dotClassName: 'bg-state-created',
    textClassName: 'text-state-created',
    chipClassName: 'border-state-created/50',
  },
  CLAIMED: {
    label: 'Взято медсестрою',
    dotClassName: 'bg-state-claimed',
    textClassName: 'text-state-claimed',
    chipClassName: 'border-state-claimed/50',
  },
  IN_PROGRESS: {
    label: 'Виконується',
    dotClassName: 'bg-state-progress',
    textClassName: 'text-state-progress',
    chipClassName: 'border-state-progress/50',
  },
  COMPLETED: {
    label: 'Виконано',
    dotClassName: 'bg-state-done',
    textClassName: 'text-state-done',
    chipClassName: 'border-state-done/50',
  },
  CANCELLED: {
    label: 'Скасовано',
    dotClassName: 'bg-state-cancelled',
    textClassName: 'text-state-cancelled',
    chipClassName: 'border-state-cancelled/50',
  },
};

export function taskStatusMeta(status: TaskStatus): StatusMeta {
  return STATUS_META[status];
}

export function priorityLabel(priority: Priority): string {
  return priority === 'URGENT' ? 'Термінове' : 'Звичайне';
}

export function roomBedLine(roomNumber: string | undefined, bedNumber: string | undefined): string {
  const parts: string[] = [];
  if (roomNumber) parts.push(`Палата ${roomNumber}`);
  if (bedNumber) parts.push(`Ліжко ${bedNumber}`);
  return parts.length > 0 ? parts.join(' • ') : 'Розміщення не вказано';
}

export function initials(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('');
}

/** ПРІЗВИЩЕ Ім'я По батькові — як у картці пацієнта вебсистеми. */
export function formalPatientName(
  fullName: string,
  lastName: string | undefined,
): { surname: string; rest: string } {
  if (lastName) {
    const rest = fullName.replace(lastName, '').trim();
    return { surname: lastName.toUpperCase(), rest };
  }
  const [first, ...others] = fullName.split(/\s+/).filter(Boolean);
  return { surname: (first ?? fullName).toUpperCase(), rest: others.join(' ') };
}
