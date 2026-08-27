-- RehaFlow: адресні завдання для персоналу.
-- Виконати один раз у Turso/libSQL після оновлення backend.
ALTER TABLE medical_tasks ADD COLUMN target_role TEXT NOT NULL DEFAULT 'NURSE';
CREATE INDEX IF NOT EXISTS idx_medical_tasks_target_role ON medical_tasks (target_role, status, scheduled_at);
