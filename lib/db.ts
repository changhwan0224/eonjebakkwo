import { sql } from "@vercel/postgres";

let schemaPromise: Promise<void> | null = null;

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS reminders (
      id BIGSERIAL PRIMARY KEY,
      item_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      cycle TEXT NOT NULL,
      days INTEGER NOT NULL,
      purchase_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS reminders_due_date_idx
    ON reminders (due_date)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id BIGSERIAL PRIMARY KEY,
      reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
      alert_date DATE NOT NULL,
      alert_type TEXT NOT NULL,
      sent_at TIMESTAMPTZ NULL,
      UNIQUE (reminder_id, alert_date, alert_type)
    )
  `;
}

export async function ensureSchema() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL 환경변수가 필요해요.");
  }

  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

export { sql };
