export type Role = 'ADMIN' | 'DOCTOR' | 'NURSE';

export type PatientState = 'ACTIVE' | 'DISCHARGED' | 'UNKNOWN';

export type TaskStatus =
  | 'CREATED'
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type Priority = 'NORMAL' | 'URGENT';

export type PrescriptionType =
  | 'MANIPULATION'
  | 'INJECTION'
  | 'PROCEDURE'
  | 'MEDICATION'
  | 'EXAMINATION'
  | 'PHYSIOTHERAPY'
  | 'OTHER';

export interface User {
  id: string;
  fullName: string;
  email: string | undefined;
  role: Role | null;
  position: string | undefined;
  phone: string | undefined;
}

export interface Patient {
  id: string;
  fullName: string;
  lastName: string | undefined;
  firstName: string | undefined;
  middleName: string | undefined;
  roomId: string | undefined;
  roomNumber: string | undefined;
  bedId: string | undefined;
  bedNumber: string | undefined;
  state: PatientState;
  stateLabel: string;
  diagnosis: string | undefined;
  birthDate: string | undefined;
  admittedAt: string | undefined;
  doctorId: string | undefined;
  doctorName: string | undefined;
  phone: string | undefined;
  note: string | undefined;
}

export interface Prescription {
  id: string;
  patientId: string | undefined;
  patientName: string | undefined;
  roomNumber: string | undefined;
  bedNumber: string | undefined;
  type: PrescriptionType;
  typeLabel: string;
  title: string;
  details: string | undefined;
  scheduledAt: string | undefined;
  priority: Priority;
  doctorId: string | undefined;
  doctorName: string | undefined;
  status: TaskStatus | null;
  createdAt: string | undefined;
  taskId: string | undefined;
}

export interface MedicalTask {
  id: string;
  prescriptionId: string | undefined;
  patientId: string | undefined;
  patientName: string;
  roomNumber: string | undefined;
  bedNumber: string | undefined;
  title: string;
  typeLabel: string | undefined;
  details: string | undefined;
  scheduledAt: string | undefined;
  priority: Priority;
  status: TaskStatus;
  doctorId: string | undefined;
  doctorName: string | undefined;
  claimedById: string | undefined;
  claimedByName: string | undefined;
  claimedAt: string | undefined;
  completedAt: string | undefined;
  comment: string | undefined;
  createdAt: string | undefined;
}

export interface HistoryEntry {
  id: string;
  patientId: string | undefined;
  patientName: string | undefined;
  title: string;
  performedAt: string | undefined;
  doctorName: string | undefined;
  nurseName: string | undefined;
  statusLabel: string;
  status: TaskStatus | null;
  comment: string | undefined;
  deviceLabel: string | undefined;
}

export interface PatientDocument {
  id: string;
  name: string;
  typeLabel: string | undefined;
  url: string | undefined;
  createdAt: string | undefined;
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  model: string;
  os: string | undefined;
  appVersion: string | undefined;
  lastSeenAt: string | undefined;
  isCurrent: boolean;
}

export interface Shift {
  id: string;
  userId: string | undefined;
  startedAt: string | undefined;
  endedAt: string | undefined;
  isActive: boolean;
}

export interface CreatePrescriptionInput {
  patientId: string;
  patientName: string | undefined;
  roomId: string | undefined;
  roomNumber: string | undefined;
  bedId: string | undefined;
  bedNumber: string | undefined;
  type: PrescriptionType;
  title: string;
  details: string | undefined;
  scheduledAt: string;
  priority: Priority;
}

export const PRESCRIPTION_TYPES: { value: PrescriptionType; label: string }[] = [
  { value: 'MANIPULATION', label: 'Маніпуляція' },
  { value: 'INJECTION', label: 'Ін’єкція' },
  { value: 'PROCEDURE', label: 'Процедура' },
  { value: 'MEDICATION', label: 'Медикамент' },
  { value: 'EXAMINATION', label: 'Обстеження' },
  { value: 'PHYSIOTHERAPY', label: 'Фізіотерапія' },
  { value: 'OTHER', label: 'Інше' },
];

export function prescriptionTypeLabel(type: PrescriptionType): string {
  return PRESCRIPTION_TYPES.find((item) => item.value === type)?.label ?? 'Інше';
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Адміністратор',
  DOCTOR: 'Лікар',
  NURSE: 'Медична сестра',
};
