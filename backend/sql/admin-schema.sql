-- RehaFlow administration additions.
-- Safe to run on the existing Turso/libSQL database.

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS archive_events (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  user_id TEXT,
  user_role TEXT
);
CREATE INDEX IF NOT EXISTS idx_archive_events_entity ON archive_events(entity, entity_id, created_at);

CREATE TABLE IF NOT EXISTS admin_appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  cabinet_id TEXT,
  cabinet_name TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_schedule ON admin_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_patient ON admin_appointments(patient_id, scheduled_at);

INSERT OR IGNORE INTO role_permissions(role,permission,allowed) VALUES
('OWNER','staff.manage',1),('OWNER','rooms.manage',1),('OWNER','beds.manage',1),('OWNER','archive.manage',1),('OWNER','audit.read',1),('OWNER','backup.run',1),('OWNER','appointments.manage',1),
('ADMIN','staff.manage',1),('ADMIN','rooms.manage',1),('ADMIN','beds.manage',1),('ADMIN','archive.manage',1),('ADMIN','audit.read',1),('ADMIN','backup.run',1),('ADMIN','appointments.manage',1),
('MEDICAL_DIRECTOR','staff.manage',0),('MEDICAL_DIRECTOR','rooms.manage',1),('MEDICAL_DIRECTOR','beds.manage',1),('MEDICAL_DIRECTOR','archive.manage',1),('MEDICAL_DIRECTOR','audit.read',1),('MEDICAL_DIRECTOR','appointments.manage',1),
('DEPARTMENT_HEAD','staff.manage',0),('DEPARTMENT_HEAD','rooms.manage',1),('DEPARTMENT_HEAD','beds.manage',1),('DEPARTMENT_HEAD','archive.manage',1),('DEPARTMENT_HEAD','audit.read',1),('DEPARTMENT_HEAD','appointments.manage',1),
('DOCTOR','prescriptions.create',1),('DOCTOR','tasks.read',1),('DOCTOR','patients.read',1),('DOCTOR','appointments.manage',1),
('NURSE','tasks.read',1),('NURSE','tasks.claim',1),('NURSE','tasks.complete',1),('NURSE','patients.read',1),
('RECEPTION','patients.create',1),('RECEPTION','patients.read',1),('RECEPTION','appointments.manage',1);