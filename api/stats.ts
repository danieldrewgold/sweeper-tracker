import { createHash, timingSafeEqual } from 'node:crypto';
import { db, ensureSchema } from './_lib/db.js';
import { STATS_QUERIES, type StatsKey, type StatsRows } from './_lib/statsQueries.js';

// Password-protected weekly stats (served at /stats via vercel.json). HTTP Basic auth; any username.

const ENVS = new Set(['production', 'preview', 'development']);

function authorized(request: Request): boolean {
  const password = process.env.STATS_PASSWORD;
  const header = request.headers.get('authorization') ?? '';
  if (!password || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const given = decoded.slice(decoded.indexOf(':') + 1);
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(password).digest();
  return timingSafeEqual(a, b);
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const num = (v: unknown) => Number(v ?? 0);
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((100 * part) / whole)}%` : 'n/a');

function table(headers: string[], rows: unknown[][]): string {
  if (rows.length === 0) return '<p class="muted">No data yet.</p>';
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderStats(env: string, d: StatsRows): string {
  const s = d.summary[0] ?? {};
  const rb = d.repeatBlock[0] ?? {};
  const devTotal = d.devices.reduce((n, r) => n + num(r.visitors), 0);
  const generated = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>SweepTracker stats</title>
<style>
  body{font:15px/1.45 system-ui,sans-serif;margin:0 auto;max-width:880px;padding:16px;color:#1a202c;background:#fff}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 8px}
  .muted{color:#718096;font-size:13px} .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
  .tile{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px} .tile b{display:block;font-size:24px}
  table{border-collapse:collapse;width:100%;font-size:14px} th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #edf2f7}
  th{color:#4a5568;font-weight:600} td:not(:first-child),th:not(:first-child){text-align:right}
</style></head><body>
<h1>SweepTracker stats</h1>
<p class="muted">Environment: ${esc(env)}. Generated ${esc(generated)} (New York time). Days are New York calendar days.</p>

<div class="tiles">
  <div class="tile"><b>${num(s.visitors_7d)}</b>Unique visitors, last 7 days<br><span class="muted">prior 7 days: ${num(s.visitors_prev_7d)}</span></div>
  <div class="tile"><b>${num(s.lookups_7d)}</b>Block lookups, last 7 days<br><span class="muted">by ${num(s.lookup_visitors_7d)} visitors</span></div>
  <div class="tile"><b>${num(rb.repeat_visitors)}</b>Looked up the same block on 2+ days (30 days)<br><span class="muted">${pct(num(rb.repeat_visitors), num(rb.lookup_visitors))} of ${num(rb.lookup_visitors)} visitors who looked up a block</span></div>
</div>

<h2>Returning within 14 days</h2>
<p class="muted">Visitors first seen that week who came back on a different day within 14 days of their first visit.</p>
${table(['Week of', 'New visitors', 'Returned', 'Rate', 'Status'],
  d.returning.map((r) => [r.week_of, num(r.visitors), num(r.returned), pct(num(r.returned), num(r.visitors)), r.complete ? 'complete' : 'partial']))}

<h2>Phone vs desktop, last 7 days</h2>
${table(['Device', 'Visitors', 'Share'], d.devices.map((r) => [r.device, num(r.visitors), pct(num(r.visitors), devTotal)]))}

<h2>Top 25 blocks, last 7 days</h2>
${table(['Block', 'Segment', 'Visitors', 'Lookups'], d.topBlocks.map((r) => [r.label ?? '', r.segment_id, num(r.visitors), num(r.lookups)]))}

<h2>Top referrers, last 7 days</h2>
${table(['Site', 'Visitors'], d.referrers.map((r) => [r.domain, num(r.visitors)]))}

<h2>How blocks were looked up, last 7 days</h2>
${table(['Source', 'Lookups'], d.sources.map((r) => [r.source, num(r.lookups)]))}

<h2>Daily, last 14 days</h2>
${table(['Day', 'Visitors', 'Lookups'], d.daily.map((r) => [r.day, num(r.visitors), num(r.lookups)]))}
</body></html>`;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
    if (!process.env.STATS_PASSWORD) {
      return new Response('Stats are not configured (STATS_PASSWORD is not set).', { status: 503, headers: noStore });
    }
    if (!authorized(request)) {
      return new Response('Password required.', {
        status: 401,
        headers: { ...noStore, 'WWW-Authenticate': 'Basic realm="SweepTracker stats", charset="UTF-8"' },
      });
    }

    const requested = new URL(request.url).searchParams.get('env') ?? 'production';
    const env = ENVS.has(requested) ? requested : 'production';

    await ensureSchema();
    const sql = db();
    const keys = Object.keys(STATS_QUERIES) as StatsKey[];
    const results = await Promise.all(keys.map((k) => sql.query(STATS_QUERIES[k], [env])));
    const data = Object.fromEntries(keys.map((k, i) => [k, results[i]])) as StatsRows;

    return new Response(renderStats(env, data), {
      headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
