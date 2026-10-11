// SQL behind /stats. Each query takes the environment as $1. Days are New York calendar days.

const NY_DAY = `(ts AT TIME ZONE 'America/New_York')::date`;

// Borough of a lookup: the logged CSCL code, else the label's ", Borough" suffix (rows from before codes were logged).
const BOROUGH = `coalesce(
  CASE props->>'boro' WHEN '1' THEN 'Manhattan' WHEN '2' THEN 'Bronx' WHEN '3' THEN 'Brooklyn'
                      WHEN '4' THEN 'Queens' WHEN '5' THEN 'Staten Island' END,
  substring(block_label from ', (Manhattan|Bronx|Brooklyn|Queens|Staten Island)$'),
  'Unknown')`;

// Lookups from the last 30 days, plus the visitor/block pairs looked up on 2+ different days.
const AREA_LOOKUPS = `
  WITH l AS (
    SELECT visitor_id, segment_id, ${NY_DAY} AS day, ${BOROUGH} AS borough, props->>'zip' AS zip
    FROM events
    WHERE env = $1 AND type = 'lookup' AND ts >= now() - interval '30 days'
  ), rep AS (
    SELECT visitor_id, segment_id FROM l GROUP BY 1, 2 HAVING count(DISTINCT day) >= 2
  )`;

const AREA_COUNTS = `
  count(DISTINCT l.visitor_id) AS visitors, count(*) AS lookups, count(DISTINCT l.segment_id) AS blocks,
  count(DISTINCT rep.visitor_id) AS repeat_visitors`;

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

  // A visitor who looked up blocks in two areas counts in both; all_visitors is the share denominator.
  boroughs: `${AREA_LOOKUPS}
    SELECT borough, ${AREA_COUNTS}, (SELECT count(DISTINCT visitor_id) FROM l) AS all_visitors
    FROM l LEFT JOIN rep USING (visitor_id, segment_id)
    GROUP BY borough
    ORDER BY borough = 'Unknown', visitors DESC, lookups DESC`,

  zips: `${AREA_LOOKUPS}
    SELECT zip, string_agg(DISTINCT borough, ' / ') AS borough, ${AREA_COUNTS}
    FROM l LEFT JOIN rep USING (visitor_id, segment_id)
    GROUP BY zip
    ORDER BY zip IS NULL, visitors DESC, lookups DESC`,

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

/** Every block looked up in the retained data (up to 12 months), for the CSV download. Not run on page loads. */
export const BLOCKS_EXPORT = `
  WITH l AS (
    SELECT visitor_id, segment_id, ts, ${NY_DAY} AS day, block_label, ${BOROUGH} AS borough, props->>'zip' AS zip
    FROM events
    WHERE env = $1 AND type = 'lookup'
  ), rep AS (
    SELECT visitor_id, segment_id FROM l
    WHERE ts >= now() - interval '30 days'
    GROUP BY 1, 2 HAVING count(DISTINCT day) >= 2
  )
  SELECT segment_id, max(block_label) AS label, max(borough) AS borough,
         string_agg(DISTINCT zip, ' / ') AS zip,
         count(DISTINCT l.visitor_id) FILTER (WHERE ts >= now() - interval '7 days') AS visitors_7d,
         count(*) FILTER (WHERE ts >= now() - interval '7 days') AS lookups_7d,
         count(DISTINCT l.visitor_id) FILTER (WHERE ts >= now() - interval '30 days') AS visitors_30d,
         count(*) FILTER (WHERE ts >= now() - interval '30 days') AS lookups_30d,
         count(DISTINCT rep.visitor_id) AS repeat_visitors_30d,
         count(DISTINCT l.visitor_id) AS visitors_12mo,
         count(*) AS lookups_12mo,
         to_char(min(day), 'YYYY-MM-DD') AS first_seen,
         to_char(max(day), 'YYYY-MM-DD') AS last_seen
  FROM l LEFT JOIN rep USING (visitor_id, segment_id)
  GROUP BY segment_id
  ORDER BY visitors_30d DESC, visitors_12mo DESC, lookups_12mo DESC, segment_id`;

export type StatsKey = keyof typeof STATS_QUERIES;
export type StatsRows = Record<StatsKey, Record<string, unknown>[]>;
