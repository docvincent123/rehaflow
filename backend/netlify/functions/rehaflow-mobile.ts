/* eslint-disable */
// @ts-nocheck
/**
 * =====================================================================
 * RehaFlow — мобільні endpoints для існуючого Netlify Functions API.
 *
 * КУДИ КЛАСТИ: у репозиторій вебсистеми, поряд з наявною функцією,
 * що обслуговує /api/baas (наприклад netlify/functions/baas.ts).
 *
 * ЯК ПІДКЛЮЧИТИ: у наявному роутері /api/baas додати делегування
 * невідомих шляхів у цей модуль ПЕРЕД тим, як він повертає
 * { error: 'API endpoint not found' }:
 *
 *     import { handleMobileRoute } from './rehaflow-mobile';
 *     const mobile = await handleMobileRoute(event, currentUser);
 *     if (mobile) return mobile;
 *
 * Файл написаний під Turso/libSQL (@libsql/client). Аутентифікація
 * НЕ дублюється: користувач приходить з наявного механізму сесій
 * вебсистеми (параметр `user`). Єдине місце, яке потрібно узгодити —
 * функція `assertUser` нижче.
 * =====================================================================
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BASE = '/api/baas';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

type Role = 'ADMIN' | 'DOCTOR' | 'NURSE';

interface SessionUser {
  id: string;
  fullName: string;
  role: Role;
}

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function parseBody(event: { body?: string | null }): Record<string, any> {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

/** Серверна перевірка ролі. Клієнт не може її обійти. */
function assertUser(user: SessionUser | null, roles?: Role[]) {
  if (!user) return json(401, { error: 'Не авторизовано' });
  if (roles && !roles.includes(user.role)) {
    return json(403, { error: 'Недостатньо прав для цієї дії' });
  }
  return null;
}

async function audit(entry: {
  user: SessionUser | null;
  action: string;
  entity?: string;
  entityId?: string;
  deviceId?: string;
  ip?: string;
  payload?: unknown;
}) {
  await db.execute({
    sql: `INSERT INTO audit_log (id, created_at, user_id, user_role, action, entity, entity_id, device_id, ip, payload)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newId('aud'),
      nowIso(),
      entry.user?.id ?? null,
      entry.user?.role ?? null,
      entry.action,
      entry.entity ?? null,
      entry.entityId ?? null,
      entry.deviceId ?? null,
      entry.ip ?? null,
      entry.payload ? JSON.stringify(entry.payload) : null,
    ],
  });
}

// ---------------------------------------------------------------------
// Push (Expo)
// ---------------------------------------------------------------------

async function sendExpoPush(
  tokens: string[],
  message: { title: string; body: string; data?: Record<string, unknown>; urgent?: boolean },
) {
  const valid = tokens.filter((token) => token && token.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  const messages = valid.map((token) => ({
    to: token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: 'default',
    priority: 'high',
    channelId: message.urgent ? 'urgent' : 'tasks',
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  }).catch(() => undefined);
}

/** Push-токени медсестер, які ЗАРАЗ на зміні. */
async function nursesOnShiftTokens(): Promise<string[]> {
  const result = await db.execute({
    sql: `SELECT d.push_token AS token
            FROM staff_devices d
            JOIN staff_shifts s ON s.user_id = d.user_id
           WHERE s.ended_at IS NULL
             AND s.role = 'NURSE'
             AND d.revoked_at IS NULL
             AND d.push_token IS NOT NULL`,
    args: [],
  });
  return result.rows.map((row: any) => String(row.token));
}

async function userTokens(userId: string): Promise<string[]> {
  const result = await db.execute({
    sql: `SELECT push_token AS token FROM staff_devices
           WHERE user_id = ? AND revoked_at IS NULL AND push_token IS NOT NULL`,
    args: [userId],
  });
  return result.rows.map((row: any) => String(row.token));
}

// ---------------------------------------------------------------------
// Мапінг рядків БД у формат мобільного застосунку
// ---------------------------------------------------------------------

function mapTaskRow(row: any) {
  return {
    id: row.id,
    prescriptionId: row.prescription_id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    roomId: row.room_id,
    roomNumber: row.room_number,
    bedId: row.bed_id,
    bedNumber: row.bed_number,
    title: row.title,
    type: row.type,
    details: row.details,
    scheduledAt: row.scheduled_at,
    priority: row.priority,
    status: row.status,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    claimedById: row.claimed_by_id,
    claimedByName: row.claimed_by_name,
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

async function loadTask(taskId: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM medical_tasks WHERE id = ?',
    args: [taskId],
  });
  return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
}

// ---------------------------------------------------------------------
// Роутер
// ---------------------------------------------------------------------

export async function handleMobileRoute(event: any, user: SessionUser | null) {
  const rawPath: string = event.path ?? '';
  const path = rawPath.startsWith(BASE) ? rawPath.slice(BASE.length) || '/' : rawPath;
  const method: string = (event.httpMethod ?? 'GET').toUpperCase();
  const body = parseBody(event);
  const ip = event.headers?.['x-forwarded-for'] ?? null;
  const deviceId = event.headers?.['x-device-id'] ?? body.deviceId ?? null;

  // ------------------- ПРИСТРОЇ -------------------
  if (path === '/devices/register' && method === 'POST') {
    const denied = assertUser(user);
    if (denied) return denied;

    await db.execute({
      sql: `INSERT INTO staff_devices (device_id, user_id, model, os, platform, app_version, last_seen_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
              user_id = excluded.user_id,
              model = excluded.model,
              os = excluded.os,
              platform = excluded.platform,
              app_version = excluded.app_version,
              last_seen_at = excluded.last_seen_at,
              revoked_at = NULL`,
      args: [
        body.deviceId,
        user.id,
        body.model ?? 'Мобільний пристрій',
        body.os ?? null,
        body.platform ?? null,
        body.appVersion ?? null,
        nowIso(),
        nowIso(),
      ],
    });
    await audit({ user, action: 'DEVICE_REGISTER', entity: 'device', entityId: body.deviceId, ip });
    return json(200, { ok: true });
  }

  if (path === '/devices/heartbeat' && method === 'POST') {
    const denied = assertUser(user);
    if (denied) return denied;
    await db.execute({
      sql: 'UPDATE staff_devices SET last_seen_at = ? WHERE device_id = ? AND user_id = ?',
      args: [nowIso(), body.deviceId, user.id],
    });
    return json(200, { ok: true });
  }

  if (path === '/devices/push-token' && method === 'POST') {
    const denied = assertUser(user);
    if (denied) return denied;
    await db.execute({
      sql: 'UPDATE staff_devices SET push_token = ?, last_seen_at = ? WHERE device_id = ? AND user_id = ?',
      args: [body.pushToken ?? null, nowIso(), body.deviceId, user.id],
    });
    return json(200, { ok: true });
  }

  if (path === '/devices' && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: `SELECT device_id, model, os, app_version, last_seen_at FROM staff_devices
             WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC`,
      args: [user.id],
    });
    return json(200, {
      devices: result.rows.map((row: any) => ({
        deviceId: row.device_id,
        model: row.model,
        os: row.os,
        appVersion: row.app_version,
        lastSeenAt: row.last_seen_at,
      })),
    });
  }

  // ------------------- ЗМІНИ -------------------
  if (path === '/shifts/current' && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: `SELECT * FROM staff_shifts WHERE user_id = ?
             ORDER BY started_at DESC LIMIT 1`,
      args: [user.id],
    });
    const row: any = result.rows[0];
    if (!row) return json(200, { shift: null });
    return json(200, {
      shift: {
        id: row.id,
        userId: row.user_id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        isActive: !row.ended_at,
      },
    });
  }

  if (path === '/shifts/start' && method === 'POST') {
    const denied = assertUser(user);
    if (denied) return denied;

    const open = await db.execute({
      sql: 'SELECT id FROM staff_shifts WHERE user_id = ? AND ended_at IS NULL',
      args: [user.id],
    });
    if (open.rows.length > 0) {
      return json(409, { error: 'Зміна вже розпочата' });
    }

    const id = newId('shift');
    const startedAt = nowIso();
    await db.execute({
      sql: `INSERT INTO staff_shifts (id, user_id, role, started_at, start_device)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, user.id, user.role, startedAt, body.device ?? deviceId ?? null],
    });
    await audit({ user, action: 'SHIFT_START', entity: 'shift', entityId: id, deviceId, ip });
    return json(201, { shift: { id, startedAt, endedAt: null, isActive: true } });
  }

  if (path === '/shifts/end' && method === 'POST') {
    const denied = assertUser(user);
    if (denied) return denied;

    const endedAt = nowIso();
    const result = await db.execute({
      sql: `UPDATE staff_shifts SET ended_at = ?, end_device = ?
             WHERE user_id = ? AND ended_at IS NULL`,
      args: [endedAt, body.device ?? deviceId ?? null, user.id],
    });
    if (result.rowsAffected === 0) return json(409, { error: 'Активної зміни немає' });

    const current = await db.execute({
      sql: 'SELECT * FROM staff_shifts WHERE user_id = ? ORDER BY started_at DESC LIMIT 1',
      args: [user.id],
    });
    const row: any = current.rows[0];
    await audit({ user, action: 'SHIFT_END', entity: 'shift', entityId: row?.id, deviceId, ip });
    return json(200, {
      shift: { id: row.id, startedAt: row.started_at, endedAt: row.ended_at, isActive: false },
    });
  }

  // ------------------- ПРИЗНАЧЕННЯ -------------------
  if (path === '/prescriptions' && method === 'POST') {
    // Медсестра НЕ може створювати лікарські призначення.
    const denied = assertUser(user, ['DOCTOR', 'ADMIN']);
    if (denied) return denied;

    const patient = await db.execute({
      sql: 'SELECT * FROM patients WHERE id = ?',
      args: [body.patientId],
    });
    const patientRow: any = patient.rows[0];
    if (!patientRow) return json(404, { error: 'Пацієнта не знайдено' });

    const patientName =
      patientRow.full_name ??
      [patientRow.last_name, patientRow.first_name, patientRow.middle_name]
        .filter(Boolean)
        .join(' ');

    const prescriptionId = newId('presc');
    const taskId = newId('task');
    const createdAt = nowIso();
    const priority = body.priority === 'URGENT' ? 'URGENT' : 'NORMAL';

    await db.batch(
      [
        {
          sql: `INSERT INTO prescriptions (id, patient_id, room_id, room_number, bed_id, bed_number,
                  type, title, details, scheduled_at, priority, doctor_id, doctor_name, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            prescriptionId,
            body.patientId,
            body.roomId ?? patientRow.room_id ?? null,
            body.roomNumber ?? patientRow.room_number ?? null,
            body.bedId ?? patientRow.bed_id ?? null,
            body.bedNumber ?? patientRow.bed_number ?? null,
            body.type ?? 'OTHER',
            body.title,
            body.details ?? null,
            body.scheduledAt ?? createdAt,
            priority,
            user.id,
            user.fullName,
            body.source ?? 'mobile',
            createdAt,
          ],
        },
        {
          sql: `INSERT INTO medical_tasks (id, prescription_id, patient_id, patient_name, room_id, room_number,
                  bed_id, bed_number, title, type, details, scheduled_at, priority, status,
                  doctor_id, doctor_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?)`,
          args: [
            taskId,
            prescriptionId,
            body.patientId,
            patientName,
            body.roomId ?? patientRow.room_id ?? null,
            body.roomNumber ?? patientRow.room_number ?? null,
            body.bedId ?? patientRow.bed_id ?? null,
            body.bedNumber ?? patientRow.bed_number ?? null,
            body.title,
            body.type ?? 'OTHER',
            body.details ?? null,
            body.scheduledAt ?? createdAt,
            priority,
            user.id,
            user.fullName,
            createdAt,
            createdAt,
          ],
        },
      ],
      'write',
    );

    await audit({
      user,
      action: 'PRESCRIPTION_CREATE',
      entity: 'prescription',
      entityId: prescriptionId,
      deviceId,
      ip,
      payload: { taskId, priority },
    });

    // Розсилка медсестрам, які на зміні.
    const time = body.scheduledAt ? new Date(body.scheduledAt) : new Date();
    const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    await sendExpoPush(await nursesOnShiftTokens(), {
      title: priority === 'URGENT' ? '🚨 Нове термінове завдання' : 'Нове завдання',
      body: `${patientName}\nПалата ${body.roomNumber ?? '—'} • Ліжко ${body.bedNumber ?? '—'}\n${body.title} о ${hhmm}`,
      data: { taskId, type: 'TASK_CREATED' },
      urgent: priority === 'URGENT',
    });

    const task = await loadTask(taskId);
    return json(201, {
      prescription: {
        id: prescriptionId,
        patientId: body.patientId,
        patientName,
        title: body.title,
        type: body.type ?? 'OTHER',
        details: body.details ?? null,
        scheduledAt: body.scheduledAt ?? createdAt,
        priority,
        doctorId: user.id,
        doctorName: user.fullName,
        status: 'AVAILABLE',
        taskId,
        createdAt,
      },
      task,
    });
  }

  if (path === '/prescriptions' && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: `SELECT p.*, t.status AS task_status, t.id AS task_id
              FROM prescriptions p
              LEFT JOIN medical_tasks t ON t.prescription_id = p.id
             ORDER BY p.created_at DESC LIMIT 300`,
      args: [],
    });
    return json(200, {
      prescriptions: result.rows.map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        roomNumber: row.room_number,
        bedNumber: row.bed_number,
        type: row.type,
        title: row.title,
        details: row.details,
        scheduledAt: row.scheduled_at,
        priority: row.priority,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        status: row.task_status,
        taskId: row.task_id,
        createdAt: row.created_at,
      })),
    });
  }

  // ------------------- ЗАВДАННЯ -------------------
  if (path === '/tasks' && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: `SELECT * FROM medical_tasks
             ORDER BY (priority = 'URGENT') DESC, scheduled_at ASC
             LIMIT 300`,
      args: [],
    });
    return json(200, { tasks: result.rows.map(mapTaskRow) });
  }

  const taskMatch = path.match(/^\/tasks\/([^/]+)(\/(claim|start|complete|cancel))?$/);
  if (taskMatch) {
    const taskId = decodeURIComponent(taskMatch[1]);
    const action = taskMatch[3];

    if (!action && method === 'GET') {
      const denied = assertUser(user);
      if (denied) return denied;
      const task = await loadTask(taskId);
      return task ? json(200, { task }) : json(404, { error: 'Завдання не знайдено' });
    }

    // --------- "ХТО ПЕРШИЙ ВЗЯВ" ----------
    // Атомарний захват: один UPDATE з умовою по статусу.
    // Другий одночасний запит отримає rowsAffected = 0 → 409.
    if (action === 'claim' && method === 'POST') {
      const denied = assertUser(user, ['NURSE']);
      if (denied) return denied;

      const claimedAt = nowIso();
      const updated = await db.execute({
        sql: `UPDATE medical_tasks
                 SET status = 'CLAIMED',
                     claimed_by_id = ?,
                     claimed_by_name = ?,
                     claimed_at = ?,
                     device_id = ?,
                     updated_at = ?
               WHERE id = ?
                 AND status IN ('CREATED', 'AVAILABLE')
                 AND claimed_by_id IS NULL`,
        args: [user.id, user.fullName, claimedAt, deviceId, claimedAt, taskId],
      });

      if (updated.rowsAffected === 0) {
        const current = await loadTask(taskId);
        if (!current) return json(404, { error: 'Завдання не знайдено' });
        return json(409, {
          error: current.claimedByName
            ? `Завдання вже виконується медсестрою ${current.claimedByName}`
            : 'Завдання вже виконується',
          claimedByName: current.claimedByName,
          task: current,
        });
      }

      await audit({ user, action: 'TASK_CLAIM', entity: 'task', entityId: taskId, deviceId, ip });
      return json(200, { task: await loadTask(taskId) });
    }

    if (action === 'start' && method === 'POST') {
      const denied = assertUser(user, ['NURSE']);
      if (denied) return denied;

      const updated = await db.execute({
        sql: `UPDATE medical_tasks SET status = 'IN_PROGRESS', started_at = ?, updated_at = ?
               WHERE id = ? AND claimed_by_id = ? AND status = 'CLAIMED'`,
        args: [nowIso(), nowIso(), taskId, user.id],
      });
      if (updated.rowsAffected === 0) {
        return json(409, { error: 'Завдання не закріплене за вами' });
      }
      await audit({ user, action: 'TASK_START', entity: 'task', entityId: taskId, deviceId, ip });
      return json(200, { task: await loadTask(taskId) });
    }

    if (action === 'complete' && method === 'POST') {
      const denied = assertUser(user, ['NURSE']);
      if (denied) return denied;

      const completedAt = body.completedAt ?? nowIso();
      const updated = await db.execute({
        sql: `UPDATE medical_tasks
                 SET status = 'COMPLETED', completed_at = ?, comment = ?, device_id = ?, updated_at = ?
               WHERE id = ? AND claimed_by_id = ? AND status IN ('CLAIMED', 'IN_PROGRESS')`,
        args: [completedAt, body.comment ?? null, deviceId, completedAt, taskId, user.id],
      });
      if (updated.rowsAffected === 0) {
        return json(409, { error: 'Завдання не можна завершити: воно не за вами або вже закрите' });
      }

      const task = await loadTask(taskId);

      // Автоматичний запис в історію пацієнта → одразу видно у вебсистемі.
      await db.execute({
        sql: `INSERT INTO patient_history (id, patient_id, patient_name, task_id, title, performed_at,
                doctor_name, nurse_id, nurse_name, status, comment, device_label)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
        args: [
          newId('hist'),
          task.patientId,
          task.patientName,
          taskId,
          task.title,
          completedAt,
          task.doctorName ?? null,
          user.id,
          user.fullName,
          body.comment ?? null,
          body.device ?? deviceId ?? null,
        ],
      });

      await audit({
        user,
        action: 'TASK_COMPLETE',
        entity: 'task',
        entityId: taskId,
        deviceId,
        ip,
        payload: { comment: body.comment ?? null, patientId: task.patientId },
      });

      // Повідомлення лікарю, який зробив призначення.
      if (task.doctorId) {
        await sendExpoPush(await userTokens(task.doctorId), {
          title: '🟢 Призначення виконано',
          body: `${task.patientName}\n${task.title}\nВиконала: ${user.fullName}`,
          data: { taskId, type: 'TASK_COMPLETED' },
        });
      }

      return json(200, { task });
    }

    if (action === 'cancel' && method === 'POST') {
      const denied = assertUser(user, ['DOCTOR', 'ADMIN']);
      if (denied) return denied;
      const updated = await db.execute({
        sql: `UPDATE medical_tasks SET status = 'CANCELLED', comment = ?, updated_at = ?
               WHERE id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
        args: [body.reason ?? null, nowIso(), taskId],
      });
      if (updated.rowsAffected === 0) return json(409, { error: 'Завдання вже закрите' });
      await audit({ user, action: 'TASK_CANCEL', entity: 'task', entityId: taskId, deviceId, ip });
      return json(200, { task: await loadTask(taskId) });
    }
  }

  // ------------------- ІСТОРІЯ -------------------
  if (path === '/history' && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: 'SELECT * FROM patient_history ORDER BY performed_at DESC LIMIT 300',
      args: [],
    });
    return json(200, { history: result.rows.map(mapHistoryRow) });
  }

  const patientHistoryMatch = path.match(/^\/patients\/([^/]+)\/history$/);
  if (patientHistoryMatch && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: 'SELECT * FROM patient_history WHERE patient_id = ? ORDER BY performed_at DESC',
      args: [decodeURIComponent(patientHistoryMatch[1])],
    });
    return json(200, { history: result.rows.map(mapHistoryRow) });
  }

  const patientTasksMatch = path.match(/^\/patients\/([^/]+)\/tasks$/);
  if (patientTasksMatch && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: 'SELECT * FROM medical_tasks WHERE patient_id = ? ORDER BY scheduled_at DESC',
      args: [decodeURIComponent(patientTasksMatch[1])],
    });
    return json(200, { tasks: result.rows.map(mapTaskRow) });
  }

  const patientPrescriptionsMatch = path.match(/^\/patients\/([^/]+)\/prescriptions$/);
  if (patientPrescriptionsMatch && method === 'GET') {
    const denied = assertUser(user);
    if (denied) return denied;
    const result = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC',
      args: [decodeURIComponent(patientPrescriptionsMatch[1])],
    });
    return json(200, {
      prescriptions: result.rows.map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        roomNumber: row.room_number,
        bedNumber: row.bed_number,
        type: row.type,
        title: row.title,
        details: row.details,
        scheduledAt: row.scheduled_at,
        priority: row.priority,
        doctorName: row.doctor_name,
        createdAt: row.created_at,
      })),
    });
  }

  // Шлях не належить мобільному API — віддаємо керування наявному роутеру.
  return null;
}

function mapHistoryRow(row: any) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    title: row.title,
    performedAt: row.performed_at,
    doctorName: row.doctor_name,
    nurseName: row.nurse_name,
    status: row.status,
    statusLabel: 'Виконано',
    comment: row.comment,
    deviceLabel: row.device_label,
  };
}

/**
 * Блокування акаунта після серії невдалих входів.
 * Викликати з наявного /auth/login.
 * Головний адміністратор цим механізмом НЕ блокується.
 */
export async function checkLoginLockout(email: string, role?: Role | null) {
  if (role === 'ADMIN' || email === process.env.REHAFLOW_ROOT_ADMIN_EMAIL) {
    return { locked: false };
  }
  const result = await db.execute({
    sql: 'SELECT failed_count, locked_until FROM login_attempts WHERE email = ?',
    args: [email.toLowerCase()],
  });
  const row: any = result.rows[0];
  if (!row?.locked_until) return { locked: false };
  if (new Date(row.locked_until).getTime() > Date.now()) {
    return { locked: true, until: row.locked_until };
  }
  return { locked: false };
}

export async function registerFailedLogin(email: string, role?: Role | null) {
  if (role === 'ADMIN' || email === process.env.REHAFLOW_ROOT_ADMIN_EMAIL) return;

  const key = email.toLowerCase();
  const maxAttempts = Number(process.env.REHAFLOW_MAX_LOGIN_ATTEMPTS ?? 5);
  const lockMinutes = Number(process.env.REHAFLOW_LOCK_MINUTES ?? 15);

  const result = await db.execute({
    sql: 'SELECT failed_count FROM login_attempts WHERE email = ?',
    args: [key],
  });
  const failed = Number((result.rows[0] as any)?.failed_count ?? 0) + 1;
  const lockedUntil =
    failed >= maxAttempts ? new Date(Date.now() + lockMinutes * 60_000).toISOString() : null;

  await db.execute({
    sql: `INSERT INTO login_attempts (email, failed_count, last_failed_at, locked_until)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET
            failed_count = excluded.failed_count,
            last_failed_at = excluded.last_failed_at,
            locked_until = excluded.locked_until`,
    args: [key, lockedUntil ? 0 : failed, nowIso(), lockedUntil],
  });
}

export async function clearLoginAttempts(email: string) {
  await db.execute({
    sql: 'DELETE FROM login_attempts WHERE email = ?',
    args: [email.toLowerCase()],
  });
}
