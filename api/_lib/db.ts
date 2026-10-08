import { neon } from '@neondatabase/serverless';

/** Which deployment wrote the row, so the stats page can show production only. */
export const ENV = process.env.VERCEL_ENV ?? 'development';

let client: ReturnType<typeof neon> | null = null;
let schemaReady: Promise<void> | null = null;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    env TEXT NOT NULL,
    visitor_id UUID NOT NULL,
    type TEXT NOT NULL,
    segment_id TEXT,
    side TEXT,
    source TEXT,
    block_label TEXT,
    referrer_domain TEXT,
    device TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_env_ts ON events (env, ts)`,
  `CREATE INDEX IF NOT EXISTS events_visitor_ts ON events (visitor_id, ts)`,
  // v2: OS family, named feature events, campaign tag, and small validated details
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS os TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS name TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS campaign TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS props JSONB`,
];

/** Create the events table on first use. Idempotent; runs once per cold start. */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const sql = db();
    for (const statement of SCHEMA_STATEMENTS) await sql.query(statement);
  })().catch((err) => {
    schemaReady = null; // retry on the next request
    throw err;
  });
  return schemaReady;
}
