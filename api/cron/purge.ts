import { db, ensureSchema } from '../_lib/db.js';

// Daily retention job (vercel.json "crons"): delete raw events older than 12 months.
// If CRON_SECRET is set, Vercel sends "Authorization: Bearer $CRON_SECRET" and we require it.
// Without it the endpoint stays open: it only ever deletes rows past the retention window, so an
// extra call from anyone else is harmless.

export default {
  async fetch(request: Request): Promise<Response> {
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    await ensureSchema();
    const rows = (await db()`
      WITH deleted AS (DELETE FROM events WHERE ts < now() - interval '12 months' RETURNING 1)
      SELECT count(*)::int AS deleted FROM deleted`) as { deleted: number }[];
    return Response.json({ deleted: rows[0]?.deleted ?? 0 });
  },
};
