import type { Role } from '@/lib/api/types';

/**
 * Mobile intentionally supports only DOCTOR and NURSE.
 * ADMIN is a web-only role and must never receive mobile navigation/actions.
 * Server-side authorization remains authoritative.
 */
export function isMobileRole(role: Role | null): role is 'DOCTOR' | 'NURSE' {
  return role === 'DOCTOR' || role === 'NURSE';
}

export function canCreatePrescription(role: Role | null): boolean {
  return role === 'DOCTOR';
}

export function canClaimTask(role: Role | null): boolean {
  return role === 'NURSE';
}

export function canCompleteTask(role: Role | null): boolean {
  return role === 'NURSE';
}

export function canSeeTaskQueue(role: Role | null): boolean {
  return role === 'NURSE';
}

export function canTrackShift(role: Role | null): boolean {
  return role === 'NURSE' || role === 'DOCTOR';
}
