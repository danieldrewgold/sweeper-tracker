import { randomUUID } from 'node:crypto';
import { db, ensureSchema, ENV } from './_lib/db.js';
import { deviceFromUA, getCookie, isBot, isSameOrigin, isUuid } from './_lib/http.js';

// Analytics intake. Logs a visit or a block lookup. See /privacy for what is kept.

const COOKIE = 'vid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const SOURCES = new Set(['search', 'gps', 'map', 'saved', 'shared_link']);

function clean(value: unknown, pattern: RegExp, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return pattern.test(trimmed) ? trimmed : null;
}

function noContent(headers?: Headers): Response {
  return new Response(null, { status: 204, headers });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }
    if (!isSameOrigin(request)) return new Response(null, { status: 403 });

    const userAgent = request.headers.get('user-agent') ?? '';
    // Bots and Global Privacy Control: accept silently, log nothing, set no cookie.
    if (isBot(userAgent) || request.headers.get('sec-gpc') === '1') return noContent();

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return new Response(null, { status: 400 });
    }

    const type = body.t === 'visit' || body.t === 'lookup' ? body.t : null;
    if (!type) return new Response(null, { status: 400 });

    const segmentId = type === 'lookup' ? clean(body.seg, /^\d{1,10}$/, 10) : null;
    if (type === 'lookup' && !segmentId) return new Response(null, { status: 400 });

    const referrer = clean(body.ref, /^[a-z0-9.-]+\.[a-z]{2,}$/i, 100)?.toLowerCase() ?? null;
    const side = body.side === 'odd' || body.side === 'even' ? body.side : null;
    const source = typeof body.src === 'string' && SOURCES.has(body.src) ? body.src : null;
    const label = type === 'lookup' ? clean(body.label, /^[\w\s.,'&()/#-]+$/, 120) : null;

    const existing = getCookie(request, COOKIE);
    const isNew = !isUuid(existing);
    const visitorId = isNew ? randomUUID() : existing;

    try {
      await ensureSchema();
      await db()`INSERT INTO events
        (env, visitor_id, type, segment_id, side, source, block_label, referrer_domain, device)
        VALUES (${ENV}, ${visitorId}, ${type}, ${segmentId}, ${side}, ${source}, ${label}, ${referrer}, ${deviceFromUA(userAgent)})`;
    } catch (err) {
      // Never surface analytics failures to the page.
      console.error('analytics insert failed', err);
    }

    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (isNew) {
      headers.append(
        'Set-Cookie',
        `${COOKIE}=${visitorId}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      );
    }
    return noContent(headers);
  },
};
