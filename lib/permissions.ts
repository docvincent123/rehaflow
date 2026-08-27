import type { Role } from '@/lib/api/types';

/** Mobile roles. ADMIN remains web-only; doctors, nurses and rehab specialists use mobile. */
export function isMobileRole(role: Role | null): role is 'DOCTOR' | 'NURSE' | 'REHAB_SPECIALIST' {
  return role === 'DOCTOR' || role === 'NURSE' || role === 'REHAB_SPECIALIST';
}

/** Only doctors may create medical prescriptions/assignments. */
export function canCreatePrescription(role: Role | null): boolean { return role === 'DOCTOR'; }
/** Nurses and rehab specialists may accept work addressed to their role. */
export function canClaimTask(role: Role | null): boolean { return role === 'NURSE' || role === 'REHAB_SPECIALIST'; }
export function canCompleteTask(role: Role | null): boolean { return role === 'NURSE' || role === 'REHAB_SPECIALIST'; }
export function canSeeTaskQueue(role: Role | null): boolean { return role === 'NURSE' || role === 'REHAB_SPECIALIST'; }
export function canTrackShift(role: Role | null): boolean { return role === 'NURSE' || role === 'DOCTOR' || role === 'REHAB_SPECIALIST'; }
