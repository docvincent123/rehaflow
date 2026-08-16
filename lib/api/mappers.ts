import { asRecord, joinName, readBoolean, readNumber, readRecord, readString } from './normalize';
import {
  type DeviceSession,
  type HistoryEntry,
  type MedicalTask,
  type PatientDocument,
  type Patient,
  type PatientState,
  type Prescription,
  type PrescriptionType,
  type Priority,
  type Role,
  type Shift,
  type TaskStatus,
  type User,
  prescriptionTypeLabel,
} from './types';

export function mapRole(value: string | undefined): Role | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (/(admin|owner|superuser|адмін|адміністратор)/.test(normalized)) return 'ADMIN';
  if (/(doctor|physician|лікар|врач)/.test(normalized)) return 'DOCTOR';
  if (/(nurse|медсестр|медична сестра|сестра)/.test(normalized)) return 'NURSE';
  return null;
}

export function mapUser(input: unknown): User {
  const record = asRecord(input);
  const lastName = readString(record, ['lastName', 'surname', 'familyName']);
  const firstName = readString(record, ['firstName', 'givenName']);
  const middleName = readString(record, ['middleName', 'patronymic', 'fatherName']);

  const fullName =
    readString(record, ['fullName', 'displayName', 'name', 'title']) ??
    joinName([lastName, firstName, middleName]) ??
    readString(record, ['email']) ??
    'Користувач';

  return {
    id: readString(record, ['id', 'userId', 'uid', '_id']) ?? '',
    fullName,
    email: readString(record, ['email', 'login', 'username']),
    role: mapRole(readString(record, ['role', 'userRole', 'type', 'position'])),
    position: readString(record, ['position', 'jobTitle', 'specialty', 'department']),
    phone: readString(record, ['phone', 'phoneNumber', 'mobile']),
  };
}

function resolvePatientState(record: Record<string, unknown>): PatientState {
  const dischargedAt = readString(record, ['dischargedAt', 'dischargeDate', 'exitDate', 'leftAt']);
  if (dischargedAt) return 'DISCHARGED';

  const activeFlag = readBoolean(record, ['isActive', 'active', 'inCenter', 'isInCenter']);
  if (activeFlag === true) return 'ACTIVE';
  const dischargedFlag = readBoolean(record, ['isDischarged', 'discharged', 'archived']);
  if (dischargedFlag === true) return 'DISCHARGED';
  if (activeFlag === false) return 'DISCHARGED';

  const raw = readString(record, [
    'status',
    'state',
    'patientStatus',
    'treatmentStatus',
    'stage',
    'stayStatus',
  ]);
  if (!raw) return 'UNKNOWN';
  const normalized = raw.toLowerCase();
  if (/(discharg|виписан|archiv|closed|inactive|завершен|left)/.test(normalized)) {
    return 'DISCHARGED';
  }
  if (/(active|treat|лікуван|активн|admitted|current|open|стаціонар|in_?center)/.test(normalized)) {
    return 'ACTIVE';
  }
  return 'UNKNOWN';
}

function patientStateLabel(state: PatientState, raw: string | undefined): string {
  const explicit = raw?.trim();
  if (explicit && /[а-яіїєґ]/i.test(explicit)) return explicit;
  if (state === 'ACTIVE') return 'проходить лікування';
  if (state === 'DISCHARGED') return 'виписаний';
  return explicit ?? 'уточнюється';
}

export function mapPatient(input: unknown): Patient {
  const record = asRecord(input);
  const room = readRecord(record, ['room', 'ward', 'roomInfo']);
  const bed = readRecord(record, ['bed', 'bedInfo', 'place']);

  const lastName = readString(record, ['lastName', 'surname', 'familyName']);
  const firstName = readString(record, ['firstName', 'givenName']);
  const middleName = readString(record, ['middleName', 'patronymic', 'fatherName']);
  const fullName =
    joinName([lastName, firstName, middleName]) ??
    readString(record, ['fullName', 'displayName', 'name', 'patientName']) ??
    'Пацієнт без імені';

  const state = resolvePatientState(record);
  const rawState = readString(record, [
    'statusLabel',
    'statusText',
    'stateLabel',
    'status',
    'state',
    'treatmentStatus',
  ]);

  return {
    id: readString(record, ['id', 'patientId', 'uuid', '_id', 'code']) ?? '',
    fullName,
    lastName,
    firstName,
    middleName,
    roomId: readString(record, ['roomId']) ?? readString(room, ['id', 'roomId']),
    roomNumber:
      readString(record, ['roomNumber', 'roomNo', 'wardNumber', 'room', 'ward']) ??
      readString(room, ['number', 'roomNumber', 'name', 'title', 'code']),
    bedId: readString(record, ['bedId']) ?? readString(bed, ['id', 'bedId']),
    bedNumber:
      readString(record, ['bedNumber', 'bedNo', 'bed', 'placeNumber']) ??
      readString(bed, ['number', 'bedNumber', 'name', 'title', 'code']),
    state,
    stateLabel: patientStateLabel(state, rawState),
    diagnosis: readString(record, ['diagnosis', 'mainDiagnosis', 'diagnose', 'conclusion']),
    birthDate: readString(record, ['birthDate', 'dob', 'dateOfBirth', 'birthday']),
    admittedAt: readString(record, ['admittedAt', 'admissionDate', 'startDate', 'checkInAt']),
    doctorId: readString(record, ['doctorId', 'attendingDoctorId']),
    doctorName:
      readString(record, ['doctorName', 'attendingDoctor', 'doctorFullName']) ??
      readString(readRecord(record, ['doctor', 'attendingDoctor']), ['fullName', 'name']),
    phone: readString(record, ['phone', 'phoneNumber', 'contactPhone']),
    note: readString(record, ['note', 'notes', 'comment', 'description']),
  };
}

export function mapTaskStatus(value: string | undefined): TaskStatus | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (/(CREATED|NEW|НОВЕ|СТВОРЕНО)/.test(normalized)) return 'CREATED';
  if (/(AVAILABLE|OPEN|PENDING|FREE|ДОСТУПНЕ|ОЧІКУЄ)/.test(normalized)) return 'AVAILABLE';
  if (/(CLAIMED|TAKEN|ASSIGNED|ACCEPTED|ВЗЯТО|ЗАКРІПЛЕНО)/.test(normalized)) return 'CLAIMED';
  if (/(IN_PROGRESS|INPROGRESS|RUNNING|STARTED|IN_WORK|ВИКОНУЄТЬСЯ)/.test(normalized)) {
    return 'IN_PROGRESS';
  }
  if (/(COMPLETED|COMPLETE|DONE|FINISHED|ВИКОНАНО|ЗАВЕРШЕНО)/.test(normalized)) return 'COMPLETED';
  if (/(CANCELL?ED|REJECTED|СКАСОВАНО|ВІДМІНЕНО)/.test(normalized)) return 'CANCELLED';
  return null;
}

export function mapPriority(record: Record<string, unknown>): Priority {
  const urgentFlag = readBoolean(record, ['isUrgent', 'urgent', 'emergency']);
  if (urgentFlag === true) return 'URGENT';

  const raw = readString(record, ['priority', 'urgency', 'importance', 'priorityLabel']);
  if (!raw) return 'NORMAL';
  const normalized = raw.toLowerCase();
  if (/(urgent|термін|critical|high|emergency|негайн|cito)/.test(normalized)) return 'URGENT';

  const numeric = readNumber(record, ['priority', 'priorityLevel']);
  if (numeric !== undefined && numeric >= 2) return 'URGENT';
  return 'NORMAL';
}

function mapPrescriptionType(value: string | undefined): PrescriptionType {
  if (!value) return 'OTHER';
  const normalized = value.trim().toLowerCase();
  if (/(inject|ін.єкц|ин.екц|infusion|капельн)/.test(normalized)) return 'INJECTION';
  if (/(manipul|маніпул)/.test(normalized)) return 'MANIPULATION';
  if (/(procedure|процедур)/.test(normalized)) return 'PROCEDURE';
  if (/(medicat|drug|препарат|медикамент|таблет)/.test(normalized)) return 'MEDICATION';
  if (/(exam|аналіз|обслід|обстеж|diagnost)/.test(normalized)) return 'EXAMINATION';
  if (/(physio|фізіо|реабіліт|масаж|lfk|лфк)/.test(normalized)) return 'PHYSIOTHERAPY';
  return 'OTHER';
}

/** Дата+час можуть приходити разом або окремими полями. */
function resolveScheduledAt(record: Record<string, unknown>): string | undefined {
  const combined = readString(record, [
    'scheduledAt',
    'scheduledFor',
    'dueAt',
    'plannedAt',
    'executeAt',
    'datetime',
    'dateTime',
    'appointmentAt',
  ]);
  if (combined) return combined;

  const date = readString(record, ['date', 'scheduledDate', 'plannedDate']);
  const time = readString(record, ['time', 'scheduledTime', 'plannedTime', 'hour']);
  if (date && time) return `${date}T${time.length === 5 ? `${time}:00` : time}`;
  return date ?? undefined;
}

export function mapPrescription(input: unknown): Prescription {
  const record = asRecord(input);
  const patient = readRecord(record, ['patient']);
  const doctor = readRecord(record, ['doctor', 'createdBy', 'author']);
  const type = mapPrescriptionType(
    readString(record, ['type', 'prescriptionType', 'category', 'kind', 'typeLabel']),
  );

  return {
    id: readString(record, ['id', 'prescriptionId', 'treatmentId', 'uuid', '_id']) ?? '',
    patientId: readString(record, ['patientId']) ?? readString(patient, ['id', 'patientId']),
    patientName:
      readString(record, ['patientName', 'patientFullName']) ??
      readString(patient, ['fullName', 'name']),
    roomNumber:
      readString(record, ['roomNumber', 'room']) ??
      readString(patient, ['roomNumber', 'room']) ??
      readString(readRecord(record, ['room']), ['number', 'name']),
    bedNumber:
      readString(record, ['bedNumber', 'bed']) ??
      readString(patient, ['bedNumber', 'bed']) ??
      readString(readRecord(record, ['bed']), ['number', 'name']),
    type,
    typeLabel: readString(record, ['typeLabel', 'categoryLabel']) ?? prescriptionTypeLabel(type),
    title:
      readString(record, ['title', 'name', 'prescription', 'manipulation', 'procedure']) ?? '—',
    details: readString(record, ['details', 'description', 'comment', 'instructions', 'note']),
    scheduledAt: resolveScheduledAt(record),
    priority: mapPriority(record),
    doctorId:
      readString(record, ['doctorId', 'createdById', 'authorId']) ?? readString(doctor, ['id']),
    doctorName:
      readString(record, ['doctorName', 'createdByName', 'prescribedBy']) ??
      readString(doctor, ['fullName', 'name']),
    status: mapTaskStatus(readString(record, ['status', 'state', 'taskStatus'])),
    createdAt: readString(record, ['createdAt', 'created', 'createdOn']),
    taskId: readString(record, ['taskId']) ?? readString(readRecord(record, ['task']), ['id']),
  };
}

export function mapTask(input: unknown): MedicalTask {
  const record = asRecord(input);
  const patient = readRecord(record, ['patient']);
  const prescription = readRecord(record, ['prescription', 'treatment']);
  const doctor = readRecord(record, ['doctor', 'createdBy', 'prescribedBy', 'author']);
  const nurse = readRecord(record, ['nurse', 'claimedBy', 'assignee', 'performer', 'executor']);

  const patientName =
    readString(record, ['patientName', 'patientFullName']) ??
    readString(patient, ['fullName', 'name']) ??
    joinName([
      readString(patient, ['lastName', 'surname']),
      readString(patient, ['firstName']),
      readString(patient, ['middleName', 'patronymic']),
    ]) ??
    'Пацієнт';

  return {
    id: readString(record, ['id', 'taskId', 'uuid', '_id']) ?? '',
    prescriptionId:
      readString(record, ['prescriptionId', 'treatmentId']) ?? readString(prescription, ['id']),
    patientId: readString(record, ['patientId']) ?? readString(patient, ['id', 'patientId']),
    patientName,
    roomNumber:
      readString(record, ['roomNumber', 'room', 'ward']) ??
      readString(patient, ['roomNumber', 'room']) ??
      readString(readRecord(record, ['room']), ['number', 'name']),
    bedNumber:
      readString(record, ['bedNumber', 'bed']) ??
      readString(patient, ['bedNumber', 'bed']) ??
      readString(readRecord(record, ['bed']), ['number', 'name']),
    title:
      readString(record, ['title', 'name', 'prescription', 'manipulation', 'procedure', 'task']) ??
      readString(prescription, ['title', 'name']) ??
      'Медичне завдання',
    typeLabel:
      readString(record, ['typeLabel', 'type', 'category']) ??
      readString(prescription, ['typeLabel', 'type']),
    details:
      readString(record, ['details', 'description', 'instructions', 'note']) ??
      readString(prescription, ['details', 'description']),
    scheduledAt: resolveScheduledAt(record) ?? resolveScheduledAt(prescription),
    priority: mapPriority(Object.keys(record).length > 0 ? record : prescription),
    status: mapTaskStatus(readString(record, ['status', 'state', 'taskStatus'])) ?? 'AVAILABLE',
    doctorId: readString(record, ['doctorId', 'createdById']) ?? readString(doctor, ['id']),
    doctorName:
      readString(record, ['doctorName', 'prescribedByName', 'createdByName']) ??
      readString(doctor, ['fullName', 'name']),
    claimedById:
      readString(record, ['claimedById', 'nurseId', 'assigneeId', 'performerId']) ??
      readString(nurse, ['id']),
    claimedByName:
      readString(record, ['claimedByName', 'nurseName', 'assigneeName', 'performerName']) ??
      readString(nurse, ['fullName', 'name']),
    claimedAt: readString(record, ['claimedAt', 'takenAt', 'assignedAt']),
    completedAt: readString(record, ['completedAt', 'finishedAt', 'doneAt', 'performedAt']),
    comment: readString(record, ['comment', 'completionComment', 'result', 'nurseComment']),
    createdAt: readString(record, ['createdAt', 'created', 'createdOn']),
  };
}

export function mapHistoryEntry(input: unknown): HistoryEntry {
  const record = asRecord(input);
  const patient = readRecord(record, ['patient']);
  const doctor = readRecord(record, ['doctor', 'prescribedBy', 'createdBy']);
  const nurse = readRecord(record, ['nurse', 'performedBy', 'executor', 'claimedBy']);
  const status = mapTaskStatus(readString(record, ['status', 'state', 'result']));

  return {
    id: readString(record, ['id', 'historyId', 'taskId', 'treatmentId', 'uuid', '_id']) ?? '',
    patientId: readString(record, ['patientId']) ?? readString(patient, ['id']),
    patientName: readString(record, ['patientName']) ?? readString(patient, ['fullName', 'name']),
    title:
      readString(record, [
        'title',
        'name',
        'manipulation',
        'procedure',
        'prescription',
        'action',
        'type',
      ]) ?? 'Медична маніпуляція',
    performedAt: readString(record, [
      'performedAt',
      'completedAt',
      'finishedAt',
      'doneAt',
      'date',
      'createdAt',
    ]),
    doctorName:
      readString(record, ['doctorName', 'prescribedBy', 'prescribedByName']) ??
      readString(doctor, ['fullName', 'name']),
    nurseName:
      readString(record, ['nurseName', 'performedBy', 'performedByName', 'executorName']) ??
      readString(nurse, ['fullName', 'name']),
    status,
    statusLabel: readString(record, ['statusLabel', 'statusText']) ?? 'Виконано',
    comment: readString(record, ['comment', 'note', 'result', 'conclusion']),
    deviceLabel: readString(record, ['device', 'deviceLabel', 'deviceModel', 'source']),
  };
}

export function mapDocument(input: unknown): PatientDocument {
  const record = asRecord(input);
  return {
    id: readString(record, ['id', 'documentId', 'uuid', '_id']) ?? '',
    name: readString(record, ['name', 'title', 'fileName', 'label']) ?? 'Документ',
    typeLabel: readString(record, ['type', 'typeLabel', 'category', 'mimeType']),
    url: readString(record, ['url', 'link', 'fileUrl', 'href', 'downloadUrl']),
    createdAt: readString(record, ['createdAt', 'date', 'uploadedAt']),
  };
}

export function mapDeviceSession(
  input: unknown,
  currentDeviceId: string | undefined,
): DeviceSession {
  const record = asRecord(input);
  const deviceId = readString(record, ['deviceId', 'id', 'uuid']) ?? '';
  return {
    id: readString(record, ['id', 'sessionId', 'deviceId']) ?? deviceId,
    deviceId,
    model: readString(record, ['model', 'deviceModel', 'name', 'label']) ?? 'Пристрій',
    os: readString(record, ['os', 'platform', 'osName']),
    appVersion: readString(record, ['appVersion', 'version']),
    lastSeenAt: readString(record, ['lastSeenAt', 'lastSeen', 'lastActivityAt', 'updatedAt']),
    isCurrent: Boolean(currentDeviceId) && deviceId === currentDeviceId,
  };
}

export function mapShift(input: unknown): Shift | null {
  const record = asRecord(input);
  const startedAt = readString(record, ['startedAt', 'startAt', 'start', 'shiftStart', 'beginAt']);
  const id = readString(record, ['id', 'shiftId', 'uuid', '_id']);
  if (!startedAt && !id) return null;

  const endedAt = readString(record, ['endedAt', 'endAt', 'end', 'shiftEnd', 'finishedAt']);
  const activeFlag = readBoolean(record, ['isActive', 'active', 'open']);

  return {
    id: id ?? startedAt ?? '',
    userId: readString(record, ['userId', 'nurseId', 'doctorId']),
    startedAt,
    endedAt,
    isActive: activeFlag ?? !endedAt,
  };
}
