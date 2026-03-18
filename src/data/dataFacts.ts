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
    value: '48,813',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on scheduled sweep days where GPS confirmed no sweeper visited that side of the street',
    color: 'red.500',
  },
  {
    value: '~$3.2M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket \u2014 revenue from blocks the sweeper was scheduled but never showed',
    color: 'orange.400',
  },
  {
    value: '510,701',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there \u2014 the system works most of the time',
    color: 'green.500',
  },
  {
    value: '27,420',
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
  { precinct: 100, total: 64, noSweep: 15, noSweepRate: 23.4 },
  { precinct: 33, total: 4444, noSweep: 800, noSweepRate: 18.0 },
  { precinct: 28, total: 6080, noSweep: 938, noSweepRate: 15.4 },
  { precinct: 40, total: 8720, noSweep: 1322, noSweepRate: 15.2 },
  { precinct: 24, total: 15899, noSweep: 2333, noSweepRate: 14.7 },
  { precinct: 42, total: 2978, noSweep: 426, noSweepRate: 14.3 },
  { precinct: 41, total: 3296, noSweep: 454, noSweepRate: 13.8 },
  { precinct: 78, total: 18570, noSweep: 2470, noSweepRate: 13.3 },
  { precinct: 6, total: 15181, noSweep: 1973, noSweepRate: 13.0 },
  { precinct: 77, total: 11549, noSweep: 1438, noSweepRate: 12.5 },
  { precinct: 7, total: 3600, noSweep: 447, noSweepRate: 12.4 },
  { precinct: 26, total: 5033, noSweep: 580, noSweepRate: 11.5 },
  { precinct: 52, total: 9352, noSweep: 1061, noSweepRate: 11.3 },
  { precinct: 94, total: 22801, noSweep: 2451, noSweepRate: 10.7 },
  { precinct: 101, total: 392, noSweep: 41, noSweepRate: 10.5 },
  { precinct: 13, total: 4873, noSweep: 507, noSweepRate: 10.4 },
  { precinct: 84, total: 6973, noSweep: 722, noSweepRate: 10.4 },
  { precinct: 14, total: 1957, noSweep: 202, noSweepRate: 10.3 },
  { precinct: 20, total: 14409, noSweep: 1465, noSweepRate: 10.2 },
  { precinct: 63, total: 2076, noSweep: 205, noSweepRate: 9.9 },
  { precinct: 48, total: 5368, noSweep: 524, noSweepRate: 9.8 },
  { precinct: 67, total: 8917, noSweep: 867, noSweepRate: 9.7 },
  { precinct: 1, total: 5977, noSweep: 574, noSweepRate: 9.6 },
  { precinct: 109, total: 4906, noSweep: 472, noSweepRate: 9.6 },
  { precinct: 73, total: 8070, noSweep: 754, noSweepRate: 9.3 },
  { precinct: 103, total: 4168, noSweep: 385, noSweepRate: 9.2 },
  { precinct: 49, total: 5707, noSweep: 512, noSweepRate: 9.0 },
  { precinct: 32, total: 4322, noSweep: 380, noSweepRate: 8.8 },
  { precinct: 60, total: 5222, noSweep: 455, noSweepRate: 8.7 },
  { precinct: 90, total: 21178, noSweep: 1822, noSweepRate: 8.6 },
  { precinct: 30, total: 3170, noSweep: 270, noSweepRate: 8.5 },
  { precinct: 81, total: 7611, noSweep: 641, noSweepRate: 8.4 },
  { precinct: 19, total: 41596, noSweep: 3465, noSweepRate: 8.3 },
  { precinct: 10, total: 6128, noSweep: 505, noSweepRate: 8.2 },
  { precinct: 113, total: 305, noSweep: 25, noSweepRate: 8.2 },
  { precinct: 83, total: 14928, noSweep: 1201, noSweepRate: 8.0 },
  { precinct: 102, total: 3705, noSweep: 297, noSweepRate: 8.0 },
  { precinct: 5, total: 3185, noSweep: 250, noSweepRate: 7.8 },
  { precinct: 71, total: 7854, noSweep: 613, noSweepRate: 7.8 },
  { precinct: 34, total: 5834, noSweep: 448, noSweepRate: 7.7 },
  { precinct: 61, total: 8314, noSweep: 631, noSweepRate: 7.6 },
  { precinct: 115, total: 6721, noSweep: 511, noSweepRate: 7.6 },
  { precinct: 104, total: 12972, noSweep: 970, noSweepRate: 7.5 },
  { precinct: 79, total: 17094, noSweep: 1273, noSweepRate: 7.4 },
  { precinct: 88, total: 12719, noSweep: 944, noSweepRate: 7.4 },
  { precinct: 47, total: 6031, noSweep: 440, noSweepRate: 7.3 },
  { precinct: 45, total: 2792, noSweep: 195, noSweepRate: 7.0 },
  { precinct: 46, total: 6100, noSweep: 421, noSweepRate: 6.9 },
  { precinct: 50, total: 2716, noSweep: 185, noSweepRate: 6.8 },
  { precinct: 114, total: 16555, noSweep: 1128, noSweepRate: 6.8 },
  { precinct: 23, total: 9389, noSweep: 631, noSweepRate: 6.7 },
  { precinct: 43, total: 9468, noSweep: 631, noSweepRate: 6.7 },
  { precinct: 44, total: 4782, noSweep: 322, noSweepRate: 6.7 },
  { precinct: 69, total: 6621, noSweep: 440, noSweepRate: 6.6 },
  { precinct: 72, total: 10401, noSweep: 686, noSweepRate: 6.6 },
  { precinct: 107, total: 2329, noSweep: 151, noSweepRate: 6.5 },
  { precinct: 9, total: 6254, noSweep: 388, noSweepRate: 6.2 },
  { precinct: 106, total: 16, noSweep: 1, noSweepRate: 6.2 },
  { precinct: 110, total: 4302, noSweep: 256, noSweepRate: 6.0 },
  { precinct: 70, total: 14139, noSweep: 821, noSweepRate: 5.8 },
  { precinct: 75, total: 11803, noSweep: 679, noSweepRate: 5.8 },
  { precinct: 62, total: 13743, noSweep: 748, noSweepRate: 5.4 },
  { precinct: 112, total: 4882, noSweep: 262, noSweepRate: 5.4 },
  { precinct: 108, total: 4400, noSweep: 223, noSweepRate: 5.1 },
  { precinct: 17, total: 1209, noSweep: 56, noSweepRate: 4.6 },
  { precinct: 66, total: 13550, noSweep: 604, noSweepRate: 4.5 },
  { precinct: 18, total: 1830, noSweep: 80, noSweepRate: 4.4 },
  { precinct: 25, total: 4137, noSweep: 178, noSweepRate: 4.3 },
  { precinct: 68, total: 9234, noSweep: 374, noSweepRate: 4.1 },
  { precinct: 76, total: 8393, noSweep: 258, noSweepRate: 3.1 },
  { precinct: 105, total: 100, noSweep: 2, noSweepRate: 2.0 },
  { precinct: 116, total: 76, noSweep: 1, noSweepRate: 1.3 },
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
