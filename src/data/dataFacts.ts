export interface HeadlineStat {
  value: string;
  label: string;
  detail: string;
  color: string;
}

export interface CaseStudy {
  title: string;
  borough: string;
  description: string;
  stats: { label: string; value: string; color?: string }[];
  highlight?: string;
}

export interface PrecinctRow {
  precinct: number;
  total: number;
  noSweep: number;
  noSweepRate: number;
}

export const HEADLINE_STATS: HeadlineStat[] = [
  {
    value: '55,502',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on scheduled sweep days where GPS confirmed no sweeper visited that side of the street',
    color: 'red.500',
  },
  {
    value: '~$3.6M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket \u2014 revenue from blocks the sweeper was scheduled but never showed',
    color: 'orange.400',
  },
  {
    value: '564,392',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there \u2014 the system works most of the time',
    color: 'green.500',
  },
  {
    value: '27,714',
    label: 'Verified block segments',
    detail: 'Segments with ticket data cross-referenced against sweeper GPS records',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Willoughby Ave, Fort Greene, Brooklyn \u2014 93% Skip Rate, 295 No-Sweep Tickets',
    borough: 'Brooklyn',
    description:
      'This Willoughby Ave block is scheduled for sweeping on Thursdays and Fridays, but the sweeper almost never shows. Over 10 months, 295 out of 311 tickets were issued on days with zero GPS sweeper activity. Only 16 tickets had a confirmed sweep.',
    stats: [
      { label: 'Skip rate', value: '92.7%', color: 'red.500' },
      { label: 'Tickets issued', value: '311', color: 'red.500' },
      { label: 'No-sweep tickets', value: '295', color: 'red.500' },
    ],
    highlight: 'Thu=96% skip, Fri=92% skip. The sweeper comes roughly once a month on each day, yet tickets are written nearly every sweep day.',
  },
  {
    title: '37th St, Queens \u2014 94% Skip Rate, Sweeper Barely Exists',
    borough: 'Queens',
    description:
      'This block near Northern Blvd is scheduled for sweeping on Wednesdays and Thursdays, but both days are nearly phantom routes. 236 out of 244 tickets were issued on days the sweeper never came. The sweeper showed up only 6 times in 10 months.',
    stats: [
      { label: 'Skip rate', value: '94.1%', color: 'red.500' },
      { label: 'Tickets issued', value: '244', color: 'red.500' },
      { label: 'No-sweep tickets', value: '236', color: 'red.500' },
    ],
    highlight: 'Wed=92% skip, Thu=96% skip. Both scheduled days are skipped over 90% of the time. Residents move their cars for a sweeper that almost never arrives.',
  },
  {
    title: 'Mulberry St, Little Italy \u2014 Tourist Corridor, 92% Thursday Skip Rate',
    borough: 'Manhattan',
    description:
      'In the heart of Little Italy, this Mulberry St block has a 30-minute daily ASP window (8\u20138:30AM, except Sunday). The sweeper reliably comes on Fridays (72%) but nearly never on Thursdays (8%) or Mondays (11%). 122 tickets issued over 10 months. Adjacent blocks are swept on Saturday but this one is skipped.',
    stats: [
      { label: 'Skip rate', value: '70.5%', color: 'red.500' },
      { label: 'Tickets issued', value: '122', color: 'red.500' },
      { label: 'GPS visits recorded', value: '129', color: 'blue.500' },
    ],
    highlight: 'Mon=89%, Tue=44%, Wed=83%, Thu=92%, Fri=28%, Sat=87%. The sweeper literally sweeps the next block on Saturday and skips this one.',
  },
  {
    title: 'E Tremont Ave, Bronx \u2014 93% Skip Rate, Swept Only 34 Times in 10 Months',
    borough: 'Bronx',
    description:
      'A segment on East Tremont Avenue with the highest overall skip rate among ticketed blocks. Skipped nearly every day of the week across all 6 sweep days. Only 34 GPS visits recorded over 319 days of tracking, yet 46 tickets were still written.',
    stats: [
      { label: 'Skip rate', value: '92.8%', color: 'red.500' },
      { label: 'Tickets issued', value: '46', color: 'red.500' },
      { label: 'GPS visits recorded', value: '34', color: 'blue.500' },
    ],
    highlight: 'Mon=98%, Tue=96%, Wed=96%, Thu=98%, Fri=98%, Sat=70%. Every weekday is skipped 96\u201398% of the time. Saturday is the "best" day at 70% skip.',
  },
  {
    title: 'Greene Ave, Fort Greene, Brooklyn \u2014 Skipped More Than Swept',
    borough: 'Brooklyn',
    description:
      'A residential Fort Greene block with only two scheduled sweep days, both heavily skipped. The sweeper shows up less than half the time on either day. 42 tickets issued despite the unreliable service.',
    stats: [
      { label: 'Skip rate', value: '63.0%', color: 'red.500' },
      { label: 'Tickets issued', value: '42', color: 'red.500' },
      { label: 'GPS visits recorded', value: '62', color: 'blue.500' },
    ],
    highlight: 'Mon=52% skip, Tue=74% skip. Only 2 sweep days per week, and the sweeper skips both more often than not. 42 tickets at $65 = $2,730 in fines on a block that gets spotty service.',
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 87, total: 44, noSweep: 13, noSweepRate: 29.5 },
  { precinct: 100, total: 98, noSweep: 19, noSweepRate: 19.4 },
  { precinct: 101, total: 515, noSweep: 87, noSweepRate: 16.9 },
  { precinct: 40, total: 9566, noSweep: 1487, noSweepRate: 15.5 },
  { precinct: 41, total: 3877, noSweep: 593, noSweepRate: 15.3 },
  { precinct: 28, total: 6651, noSweep: 988, noSweepRate: 14.9 },
  { precinct: 24, total: 18394, noSweep: 2672, noSweepRate: 14.5 },
  { precinct: 42, total: 3776, noSweep: 544, noSweepRate: 14.4 },
  { precinct: 6, total: 16863, noSweep: 2278, noSweepRate: 13.5 },
  { precinct: 78, total: 19420, noSweep: 2549, noSweepRate: 13.1 },
  { precinct: 7, total: 4612, noSweep: 576, noSweepRate: 12.5 },
  { precinct: 77, total: 12186, noSweep: 1515, noSweepRate: 12.4 },
  { precinct: 33, total: 8790, noSweep: 1063, noSweepRate: 12.1 },
  { precinct: 26, total: 5755, noSweep: 683, noSweepRate: 11.9 },
  { precinct: 52, total: 10554, noSweep: 1186, noSweepRate: 11.2 },
  { precinct: 94, total: 23865, noSweep: 2584, noSweepRate: 10.8 },
  { precinct: 13, total: 5071, noSweep: 540, noSweepRate: 10.6 },
  { precinct: 84, total: 7337, noSweep: 763, noSweepRate: 10.4 },
  { precinct: 14, total: 1957, noSweep: 202, noSweepRate: 10.3 },
  { precinct: 1, total: 6579, noSweep: 673, noSweepRate: 10.2 },
  { precinct: 113, total: 524, noSweep: 53, noSweepRate: 10.1 },
  { precinct: 46, total: 7841, noSweep: 787, noSweepRate: 10.0 },
  { precinct: 48, total: 6979, noSweep: 698, noSweepRate: 10.0 },
  { precinct: 109, total: 6205, noSweep: 623, noSweepRate: 10.0 },
  { precinct: 20, total: 15531, noSweep: 1545, noSweepRate: 9.9 },
  { precinct: 63, total: 2390, noSweep: 234, noSweepRate: 9.8 },
  { precinct: 67, total: 10120, noSweep: 951, noSweepRate: 9.4 },
  { precinct: 73, total: 8531, noSweep: 801, noSweepRate: 9.4 },
  { precinct: 103, total: 4962, noSweep: 459, noSweepRate: 9.3 },
  { precinct: 90, total: 23161, noSweep: 2127, noSweepRate: 9.2 },
  { precinct: 5, total: 3534, noSweep: 310, noSweepRate: 8.8 },
  { precinct: 32, total: 4561, noSweep: 397, noSweepRate: 8.7 },
  { precinct: 49, total: 6375, noSweep: 549, noSweepRate: 8.6 },
  { precinct: 19, total: 44178, noSweep: 3735, noSweepRate: 8.5 },
  { precinct: 60, total: 5888, noSweep: 502, noSweepRate: 8.5 },
  { precinct: 30, total: 3367, noSweep: 283, noSweepRate: 8.4 },
  { precinct: 79, total: 18594, noSweep: 1549, noSweepRate: 8.3 },
  { precinct: 10, total: 6202, noSweep: 507, noSweepRate: 8.2 },
  { precinct: 81, total: 7897, noSweep: 650, noSweepRate: 8.2 },
  { precinct: 83, total: 15930, noSweep: 1311, noSweepRate: 8.2 },
  { precinct: 114, total: 17803, noSweep: 1443, noSweepRate: 8.1 },
  { precinct: 34, total: 6068, noSweep: 477, noSweepRate: 7.9 },
  { precinct: 44, total: 6717, noSweep: 530, noSweepRate: 7.9 },
  { precinct: 102, total: 4552, noSweep: 358, noSweepRate: 7.9 },
  { precinct: 115, total: 7427, noSweep: 588, noSweepRate: 7.9 },
  { precinct: 50, total: 3238, noSweep: 254, noSweepRate: 7.8 },
  { precinct: 61, total: 9486, noSweep: 742, noSweepRate: 7.8 },
  { precinct: 71, total: 8612, noSweep: 666, noSweepRate: 7.7 },
  { precinct: 47, total: 6652, noSweep: 507, noSweepRate: 7.6 },
  { precinct: 88, total: 13443, noSweep: 1023, noSweepRate: 7.6 },
  { precinct: 104, total: 14731, noSweep: 1101, noSweepRate: 7.5 },
  { precinct: 112, total: 5810, noSweep: 432, noSweepRate: 7.4 },
  { precinct: 45, total: 3021, noSweep: 210, noSweepRate: 7.0 },
  { precinct: 69, total: 7348, noSweep: 497, noSweepRate: 6.8 },
  { precinct: 43, total: 10568, noSweep: 702, noSweepRate: 6.6 },
  { precinct: 72, total: 10706, noSweep: 697, noSweepRate: 6.5 },
  { precinct: 9, total: 7170, noSweep: 461, noSweepRate: 6.4 },
  { precinct: 23, total: 11171, noSweep: 715, noSweepRate: 6.4 },
  { precinct: 70, total: 15518, noSweep: 969, noSweepRate: 6.2 },
  { precinct: 75, total: 13483, noSweep: 831, noSweepRate: 6.2 },
  { precinct: 106, total: 16, noSweep: 1, noSweepRate: 6.2 },
  { precinct: 110, total: 4728, noSweep: 290, noSweepRate: 6.1 },
  { precinct: 107, total: 2795, noSweep: 168, noSweepRate: 6.0 },
  { precinct: 108, total: 4716, noSweep: 281, noSweepRate: 6.0 },
  { precinct: 62, total: 14498, noSweep: 774, noSweepRate: 5.3 },
  { precinct: 17, total: 1209, noSweep: 56, noSweepRate: 4.6 },
  { precinct: 25, total: 4735, noSweep: 217, noSweepRate: 4.6 },
  { precinct: 66, total: 14357, noSweep: 641, noSweepRate: 4.5 },
  { precinct: 18, total: 1837, noSweep: 80, noSweepRate: 4.4 },
  { precinct: 68, total: 9837, noSweep: 408, noSweepRate: 4.1 },
  { precinct: 76, total: 8784, noSweep: 294, noSweepRate: 3.3 },
  { precinct: 105, total: 100, noSweep: 2, noSweepRate: 2.0 },
  { precinct: 116, total: 78, noSweep: 1, noSweepRate: 1.3 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 18029,
  confirmedSweepTickets: 593771,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 996K+ parking tickets against DSNY\u2019s own GPS records across 18,029 street segments. A ticket is classified as "no sweep" only if it falls on a day-of-week where GPS has historically confirmed the sweeper visits that specific side of the street, but the sweeper didn\u2019t show up that particular date. Queens-style hyphenated house numbers (block-lot format like 133-14) are parsed correctly for segment matching. Day-of-week analysis uses 319 days of Mon\u2013Sat data.',
  dataCleaning:
    'Each CSCL segment represents one side of one block. ASP signs from the NYC DOT database can include rules for both curbs, so we use GPS data to determine which days the sweeper actually services each side. Per-block skip rates use only days-of-week where GPS has detected the sweeper at least once. Tickets on non-GPS-active days are excluded from no-sweep counts since they likely reflect the opposite curb\u2019s schedule. Some CSCL segments overlap geographically (e.g. service roads on wide boulevards), which can cause GPS to register on different physical IDs over time \u2014 segments with zero confirmed sweep-day tickets are excluded from worst-block rankings.',
};
