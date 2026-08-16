import type { Role } from '@/lib/api/types';

/**
 * Права на клієнті — це лише UX (сховати те, що не можна).
 * Остаточну перевірку ролі та прав виконує сервер.
 */
export function canCreatePrescription(role: Role | null): boolean {
  return role === 'DOCTOR' || role === 'ADMIN';
}

export function canClaimTask(role: Role | null): boolean {
  return role === 'NURSE';
}

export function canCompleteTask(role: Role | null): boolean {
  return role === 'NURSE';
}

export function canSeeTaskQueue(role: Role | null): boolean {
  return role === 'NURSE' || role === 'ADMIN';
}

export function canTrackShift(role: Role | null): boolean {
  return role === 'NURSE' || role === 'DOCTOR' || role === 'ADMIN';
}
