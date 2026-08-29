import { asRecord, readRecord, readString } from './normalize';
import { mapPriority, mapTaskStatus } from './mappers';
import type { MedicalTask, TaskTargetRole } from './types';

function targetRoleOf(record: Record<string, unknown>): TaskTargetRole {
  const raw = readString(record, ['targetRole', 'assignedRole', 'recipientRole', 'executorRole', 'role', 'target']);
  if (raw) return /(rehab|реаб|physio|фізіо|кінез)/i.test(raw) ? 'REHAB_SPECIALIST' : 'NURSE';
  const text = [
    readString(record, ['type', 'prescriptionType', 'category', 'kind', 'typeLabel']),
    readString(record, ['title', 'name', 'taskTitle', 'prescription', 'procedure']),
    readString(record, ['details', 'description', 'instructions']),
  ].filter(Boolean).join(' ');
  return /(rehab|реабіліт|physio|фізіо|кінез|масаж|лфк|lfk)/i.test(text) ? 'REHAB_SPECIALIST' : 'NURSE';
}

export function mapTask(input: unknown): MedicalTask {
  const record = asRecord(input);
  const patient = readRecord(record, ['patient', 'person']);
  const doctor = readRecord(record, ['doctor', 'createdBy', 'author']);
  const assignee = readRecord(record, ['claimedBy', 'assignee', 'assignedTo', 'executor', 'nurse', 'rehabSpecialist']);
  const status = mapTaskStatus(readString(record, ['status', 'state', 'taskStatus'])) ?? 'CREATED';
  const typeRaw = readString(record, ['type', 'prescriptionType', 'category', 'kind', 'typeLabel']);
  const patientName = readString(record, ['patientName', 'patientFullName']) ?? readString(patient, ['fullName', 'name']) ?? 'Пацієнт';
  const claimedByName = readString(record, ['claimedByName', 'assigneeName', 'assignedToName', 'executorName', 'nurseName', 'rehabSpecialistName']) ?? readString(assignee, ['fullName', 'name']);
  const claimedById = readString(record, ['claimedById', 'assigneeId', 'assignedToId', 'executorId', 'nurseId', 'rehabSpecialistId']) ?? readString(assignee, ['id', 'userId']);

  return {
    id: readString(record, ['id', 'taskId', 'assignmentId', 'uuid', '_id']) ?? '',
    prescriptionId: readString(record, ['prescriptionId', 'treatmentId']) ?? readString(readRecord(record, ['prescription', 'treatment']), ['id']),
    patientId: readString(record, ['patientId']) ?? readString(patient, ['id', 'patientId']),
    patientName,
    roomNumber: readString(record, ['roomNumber', 'room', 'wardNumber']) ?? readString(patient, ['roomNumber', 'room']),
    bedNumber: readString(record, ['bedNumber', 'bed', 'placeNumber']) ?? readString(patient, ['bedNumber', 'bed']),
    title: readString(record, ['title', 'name', 'taskTitle', 'prescription', 'manipulation', 'procedure']) ?? 'Медичне завдання',
    typeLabel: readString(record, ['typeLabel', 'categoryLabel']) ?? typeRaw ?? undefined,
    details: readString(record, ['details', 'description', 'comment', 'instructions', 'note']),
    scheduledAt: readString(record, ['scheduledAt', 'scheduledFor', 'dueAt', 'plannedAt', 'executeAt', 'datetime', 'dateTime', 'appointmentAt']),
    priority: mapPriority(record),
    status,
    doctorId: readString(record, ['doctorId', 'createdById', 'authorId']) ?? readString(doctor, ['id', 'userId']),
    doctorName: readString(record, ['doctorName', 'createdByName', 'prescribedBy']) ?? readString(doctor, ['fullName', 'name']),
    claimedById,
    claimedByName,
    claimedAt: readString(record, ['claimedAt', 'assignedAt', 'takenAt']),
    completedAt: readString(record, ['completedAt', 'finishedAt', 'doneAt']),
    comment: readString(record, ['comment', 'completionComment', 'result', 'note']),
    createdAt: readString(record, ['createdAt', 'created', 'createdOn']),
    targetRole: targetRoleOf(record),
  };
}
