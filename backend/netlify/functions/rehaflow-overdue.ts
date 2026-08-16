/* eslint-disable */
// @ts-nocheck
/**
 * RehaFlow — планова перевірка прострочених завдань.
 *
 * КУДИ КЛАСТИ: netlify/functions/rehaflow-overdue.ts у репозиторії вебсистеми.
 * Розклад (netlify.toml):
 *
 *   [functions."rehaflow-overdue"]
 *     schedule = "*\/5 * * * *"
 *
 * Надсилає "⚠️ Завдання прострочено" медсестрі, яка взяла завдання,
 * та лікарю, який його призначив. Кожне завдання нагадується один раз.
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const OVERDUE_MINUTES = Number(process.env.REHAFLOW_OVERDUE_MINUTES ?? 15);

async function tokensFor(userIds: string[]): Promise<string[]> {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT push_token FROM staff_devices
           WHERE user_id IN (${placeholders}) AND revoked_at IS NULL AND push_token IS NOT NULL`,
    args: ids,
  });
  return result.rows.map((row) => String(row.push_token));
}

async function push(tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  const valid = tokens.filter((token) => token.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(
      valid.map((to) => ({ to, title, body, data, sound: 'default', channelId: 'urgent' })),
    ),
  }).catch(() => undefined);
}

export default async function handler() {
  const threshold = new Date(Date.now() - OVERDUE_MINUTES * 60_000).toISOString();

  const result = await db.execute({
    sql: `SELECT id, patient_name, room_number, bed_number, title, scheduled_at,
                 claimed_by_id, doctor_id
            FROM medical_tasks
           WHERE status IN ('CREATED', 'AVAILABLE', 'CLAIMED', 'IN_PROGRESS')
             AND scheduled_at IS NOT NULL
             AND scheduled_at < ?
             AND overdue_notified_at IS NULL
           LIMIT 100`,
    args: [threshold],
  });

  for (const row of result.rows) {
    const task = row as Record<string, string | null>;
    const recipients = await tokensFor([task.claimed_by_id ?? '', task.doctor_id ?? '']);

    await push(
      recipients,
      '⚠️ Завдання прострочено',
      `${task.patient_name}\nПалата ${task.room_number ?? '—'} • Ліжко ${task.bed_number ?? '—'}\n${task.title}`,
      { taskId: task.id, type: 'TASK_OVERDUE' },
    );

    await db.execute({
      sql: 'UPDATE medical_tasks SET overdue_notified_at = ? WHERE id = ?',
      args: [new Date().toISOString(), task.id],
    });
  }

  return new Response(JSON.stringify({ checked: result.rows.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
