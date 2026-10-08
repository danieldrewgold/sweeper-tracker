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

  os: `
    SELECT coalesce(os, 'unknown') AS os, count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY visitors DESC`,

  campaigns: `
    SELECT campaign, count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND type = 'visit' AND campaign IS NOT NULL AND ts >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY visitors DESC
    LIMIT 20`,

  features: `
    SELECT name,
           CASE name
             WHEN 'alert_toggle' THEN CASE WHEN (props->>'on')::boolean
                                           THEN 'turned on, browser ' || coalesce(props->>'permission', 'unknown')
                                           ELSE 'turned off' END
             WHEN 'directions_click' THEN props->>'app'
             WHEN 'page_view' THEN props->>'page'
             ELSE '' END AS detail,
           count(DISTINCT visitor_id) AS visitors, count(*) AS events
    FROM events
    WHERE env = $1 AND type = 'event' AND name <> 'lookup_failed' AND ts >= now() - interval '7 days'
    GROUP BY 1, 2
    ORDER BY visitors DESC`,

  failedLookups: `
    SELECT props->>'reason' AS reason, count(*) AS events, count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND type = 'event' AND name = 'lookup_failed' AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY events DESC`,

  // When lookups happen relative to the block's next posted cleaning window (either side of the street).
  checkTiming: `
    SELECT bucket, count(*) AS lookups, count(DISTINCT visitor_id) AS visitors,
           count(*) FILTER (WHERE swept) AS already_swept
    FROM (
      SELECT visitor_id, coalesce((props->>'swept_today')::boolean, false) AS swept,
             CASE
               WHEN props->>'phase' = 'during' THEN '1. During the posted window'
               WHEN props->>'phase' = 'none' THEN '8. No upcoming window known'
               WHEN (props->>'mins_to_next')::int < 30 THEN '2. Under 30 min before'
               WHEN (props->>'mins_to_next')::int < 120 THEN '3. 30 min to 2 hours before'
               WHEN (props->>'mins_to_next')::int < 720 THEN '4. 2 to 12 hours before'
               WHEN (props->>'mins_to_next')::int < 1440 THEN '5. 12 to 24 hours before'
               WHEN (props->>'mins_to_next')::int < 4320 THEN '6. 1 to 3 days before'
               ELSE '7. 3 or more days before'
             END AS bucket
      FROM events
      WHERE env = $1 AND type = 'lookup' AND props ? 'phase' AND ts >= now() - interval '30 days'
    ) x
    GROUP BY bucket
    ORDER BY bucket`,

  firstLookup: `
    SELECT coalesce(source, 'unknown') AS source, count(*) AS lookups,
           round((percentile_cont(0.5) WITHIN GROUP (ORDER BY (props->>'ms_since_load')::numeric) / 1000)::numeric, 1) AS median_seconds
    FROM events
    WHERE env = $1 AND type = 'lookup' AND (props->>'first')::boolean AND props ? 'ms_since_load'
      AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY lookups DESC`,

  homeScreen: `
    SELECT count(DISTINCT visitor_id) FILTER (WHERE (props->>'standalone')::boolean) AS home_screen_visitors,
           count(DISTINCT visitor_id) AS visitors
    FROM events
    WHERE env = $1 AND type = 'visit' AND ts >= now() - interval '7 days'`,

  landing: `
    SELECT coalesce(props->>'page', 'unknown') AS page, count(*) AS visits
    FROM events
    WHERE env = $1 AND type = 'visit' AND ts >= now() - interval '7 days'
    GROUP BY 1
    ORDER BY visits DESC`,
} as const;

export type StatsKey = keyof typeof STATS_QUERIES;
export type StatsRows = Record<StatsKey, Record<string, unknown>[]>;
