import { buildAlerts, buildReminderByItemName } from "@/lib/alerts";
import { ensureSchema, sql } from "@/lib/db";
import { normalizeDateString } from "@/lib/date";
import type { AlertItem, ReminderRecord } from "@/lib/types";

interface ReminderRow {
  id: number;
  item_name: string;
  category: string;
  cycle: string;
  days: number;
  purchase_date: string;
  due_date: string;
  status: "active";
  created_at: string;
  updated_at: string;
}

interface NotificationLogRow {
  id: number;
}

export interface ClaimedAlert {
  logId: number;
  alert: AlertItem;
}

function mapReminderRow(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category,
    cycle: row.cycle,
    days: row.days,
    purchaseDate: row.purchase_date,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReminders() {
  await ensureSchema();

  const result = await sql<ReminderRow>`
    SELECT
      id,
      item_name,
      category,
      cycle,
      days,
      TO_CHAR(purchase_date, 'YYYY-MM-DD') AS purchase_date,
      TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
      status,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM reminders
    ORDER BY due_date ASC, item_name ASC
  `;

  return result.rows.map(mapReminderRow);
}

export async function saveReminder(itemName: string, purchaseDate: string) {
  const reminder = buildReminderByItemName(itemName, purchaseDate);

  await ensureSchema();

  const result = await sql<ReminderRow>`
    INSERT INTO reminders (
      item_name,
      category,
      cycle,
      days,
      purchase_date,
      due_date,
      status
    )
    VALUES (
      ${reminder.itemName},
      ${reminder.category},
      ${reminder.cycle},
      ${reminder.days},
      ${reminder.purchaseDate}::date,
      ${reminder.dueDate}::date,
      ${reminder.status}
    )
    ON CONFLICT (item_name)
    DO UPDATE SET
      category = EXCLUDED.category,
      cycle = EXCLUDED.cycle,
      days = EXCLUDED.days,
      purchase_date = EXCLUDED.purchase_date,
      due_date = EXCLUDED.due_date,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING
      id,
      item_name,
      category,
      cycle,
      days,
      TO_CHAR(purchase_date, 'YYYY-MM-DD') AS purchase_date,
      TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
      status,
      created_at::text AS created_at,
      updated_at::text AS updated_at
  `;

  return mapReminderRow(result.rows[0]);
}

export async function removeReminder(itemName: string) {
  await ensureSchema();

  const result = await sql`
    DELETE FROM reminders
    WHERE item_name = ${itemName}
  `;

  return result.rowCount > 0;
}

export async function checkAlertsByDate(checkDate: string) {
  const normalizedCheckDate = normalizeDateString(checkDate);
  const reminders = await listReminders();

  return {
    checkDate: normalizedCheckDate,
    alerts: buildAlerts(reminders, normalizedCheckDate),
  };
}

export async function claimAlertsForDate(checkDate: string): Promise<ClaimedAlert[]> {
  const { alerts } = await checkAlertsByDate(checkDate);

  if (!alerts.length) {
    return [];
  }

  const reminders = await listReminders();
  const reminderByName = new Map(reminders.map((reminder) => [reminder.itemName, reminder]));
  const claimedAlerts: ClaimedAlert[] = [];

  for (const alert of alerts) {
    const reminder = reminderByName.get(alert.itemName);

    if (!reminder) {
      continue;
    }

    const result = await sql<NotificationLogRow>`
      INSERT INTO notification_logs (
        reminder_id,
        alert_date,
        alert_type
      )
      VALUES (
        ${reminder.id},
        ${checkDate}::date,
        ${alert.alertType}
      )
      ON CONFLICT (reminder_id, alert_date, alert_type)
      DO NOTHING
      RETURNING id
    `;

    if (result.rowCount) {
      claimedAlerts.push({
        logId: result.rows[0].id,
        alert,
      });
    }
  }

  return claimedAlerts;
}

export async function markClaimedAlertsSent(logIds: number[]) {
  if (!logIds.length) {
    return;
  }

  await ensureSchema();

  for (const logId of logIds) {
    await sql`
      UPDATE notification_logs
      SET sent_at = NOW()
      WHERE id = ${logId}
    `;
  }
}

export async function releaseClaimedAlerts(logIds: number[]) {
  if (!logIds.length) {
    return;
  }

  await ensureSchema();

  for (const logId of logIds) {
    await sql`
      DELETE FROM notification_logs
      WHERE id = ${logId}
      AND sent_at IS NULL
    `;
  }
}
