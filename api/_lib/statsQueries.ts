// SQL behind /stats. Each query takes the environment as $1. Days are New York calendar days.

const NY_DAY = `(ts AT TIME ZONE 'America/New_York')::date`;

export const STATS_QUERIES = {
  summary: `
    SELECT
      count(DISTINCT visitor_id) FILTER (WHERE ts >= now() - interval '7 days') AS visitors_7d,
      count(DISTINCT visitor_id) FILTER (WHERE ts < now() - interval '7 days') AS visitors_prev_7d,
      count(*) FILTER (WHERE type = 'lookup' AND ts >= now() - interval '7 days') AS lookups_7d,
      count(DISTINCT visitor_id) FILTER (WHERE type = 'lookup' AND ts >= now() - interval '7 days') AS lookup_visitors_7d
    FROM events
    WHERE env = $1 AND ts >= now() - interval '14 days'`,

  daily: `
    SELECT to_char(${NY_DAY}, 'Dy Mon DD') AS day,
           count(DISTINCT visitor_id) AS visitors,
           count(*) FILTER (WHERE type = 'lookup') AS lookups
    FROM events
    WHERE env = $1 AND ts >= now() - interval '14 days'
    GROUP BY ${NY_DAY}
    ORDER BY ${NY_DAY} DESC`,

  // Of visitors first seen in a week, how many came back on a different day within 14 days.
  // A cohort is complete once 14 days have passed since the end of its week.
  returning: `
    WITH firsts AS (
      SELECT visitor_id, min(ts) AS first_ts FROM events WHERE env = $1 GROUP BY visitor_id
    ), cohort AS (
      SELECT visitor_id, first_ts,
             (first_ts AT TIME ZONE 'America/New_York')::date AS first_day,
             date_trunc('week', first_ts AT TIME ZONE 'America/New_York')::date AS week_start
      FROM firsts
      WHERE first_ts >= now() - interval '42 days'
    ), returned AS (
      SELECT c.visitor_id
      FROM cohort c
      WHERE EXISTS (
        SELECT 1 FROM events e
        WHERE e.env = $1 AND e.visitor_id = c.visitor_id
          AND (e.ts AT TIME ZONE 'America/New_York')::date > c.first_day
          AND e.ts <= c.first_ts + interval '14 days')
    )
    SELECT to_char(c.week_start, 'Mon DD') AS week_of,
           count(*) AS visitors,
           count(r.visitor_id) AS returned,
           (c.week_start + 21) <= (now() AT TIME ZONE 'America/New_York')::date AS complete
    FROM cohort c LEFT JOIN returned r USING (visitor_id)
    GROUP BY c.week_start
    ORDER BY c.week_start DESC`,

  // Visitors who looked up the same block on 2+ different days in the last 30 days.
  repeatBlock: `
    WITH per AS (
      SELECT visitor_id, segment_id, count(DISTINCT ${NY_DAY}) AS days
      FROM events
      WHERE env = $1 AND type = 'lookup' AND ts >= now() - interval '30 days'
      GROUP BY visitor_id, segment_id
    )
    SELECT count(DISTINCT visitor_id) FILTER (WHERE days >= 2) AS repeat_visitors,
           count(DISTINCT visitor_id) AS lookup_visitors
    FROM per`,

  topBlocks: `
    SELECT segment_id, max(block_label) AS label,
           count(*) AS lookups, count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND type = 'lookup' AND ts >= now() - interval '7 days'
    GROUP BY segment_id
    ORDER BY visitors DESC, lookups DESC
    LIMIT 25`,

  referrers: `
    SELECT coalesce(referrer_domain, '(direct or unknown)') AS domain,
           count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND type = 'visit' AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY visitors DESC
    LIMIT 15`,

  devices: `
    SELECT device, count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND ts >= now() - interval '7 days'
    GROUP BY device
    ORDER BY visitors DESC`,

  sources: `
    SELECT coalesce(source, 'unknown') AS source, count(*) AS lookups
    FROM events
    WHERE env = $1 AND type = 'lookup' AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY lookups DESC`,
} as const;

export type StatsKey = keyof typeof STATS_QUERIES;
export type StatsRows = Record<StatsKey, Record<string, unknown>[]>;
