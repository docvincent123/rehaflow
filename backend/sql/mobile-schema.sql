-- =====================================================================
-- RehaFlow — таблиці для мобільного застосунку (Turso / libSQL)
-- Виконати у базі вебсистеми. Наявні таблиці (patients, users, rooms,
-- beds) НЕ змінюються і НЕ дублюються — використовуються існуючі ID.
-- =====================================================================

-- Підключені пристрої персоналу -----------------------------------------
CREATE TABLE IF NOT EXISTS staff_devices (
  device_id     TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  model         TEXT NOT NULL,
  os            TEXT,
  platform      TEXT,
  app_version   TEXT,
  push_token    TEXT,
  last_seen_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_devices_user ON staff_devices (user_id, revoked_at);

-- Зміни персоналу (початок / кінець) ------------------------------------
CREATE TABLE IF NOT EXISTS staff_shifts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  start_device TEXT,
  end_device   TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_open ON staff_shifts (user_id, ended_at);

-- Медичні завдання ------------------------------------------------------
-- status: CREATED | AVAILABLE | CLAIMED | IN_PROGRESS | COMPLETED | CANCELLED
CREATE TABLE IF NOT EXISTS medical_tasks (
  id              TEXT PRIMARY KEY,
  prescription_id TEXT,
  patient_id      TEXT NOT NULL,
  patient_name    TEXT NOT NULL,
  room_id         TEXT,
  room_number     TEXT,
  bed_id          TEXT,
  bed_number      TEXT,
  title           TEXT NOT NULL,
  type            TEXT,
  details         TEXT,
  scheduled_at    TEXT,
  priority        TEXT NOT NULL DEFAULT 'NORMAL',
  status          TEXT NOT NULL DEFAULT 'AVAILABLE',
  doctor_id       TEXT,
  doctor_name     TEXT,
  claimed_by_id   TEXT,
  claimed_by_name TEXT,
  claimed_at      TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  comment         TEXT,
  device_id       TEXT,
  overdue_notified_at TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_medical_tasks_status ON medical_tasks (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medical_tasks_patient ON medical_tasks (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_tasks_nurse ON medical_tasks (claimed_by_id, status);

-- Призначення лікаря ----------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL,
  room_id      TEXT,
  room_number  TEXT,
  bed_id       TEXT,
  bed_number   TEXT,
  type         TEXT,
  title        TEXT NOT NULL,
  details      TEXT,
  scheduled_at TEXT,
  priority     TEXT NOT NULL DEFAULT 'NORMAL',
  doctor_id    TEXT,
  doctor_name  TEXT,
  source       TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id, created_at);

-- Історія медичних маніпуляцій пацієнта --------------------------------
CREATE TABLE IF NOT EXISTS patient_history (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL,
  patient_name TEXT,
  task_id      TEXT,
  title        TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  doctor_name  TEXT,
  nurse_id     TEXT,
  nurse_name   TEXT,
  status       TEXT NOT NULL DEFAULT 'COMPLETED',
  comment      TEXT,
  device_label TEXT
);
CREATE INDEX IF NOT EXISTS idx_patient_history_patient ON patient_history (patient_id, performed_at);

-- Журнал дій (audit log) ------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  user_id    TEXT,
  user_role  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  device_id  TEXT,
  ip         TEXT,
  payload    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at);

-- Захист від підбору пароля --------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  email         TEXT PRIMARY KEY,
  failed_count  INTEGER NOT NULL DEFAULT 0,
  last_failed_at TEXT,
  locked_until  TEXT
);
