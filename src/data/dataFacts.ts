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
    value: '79,280',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on scheduled sweep days where GPS confirmed no sweeper visited that side of the street',
    color: 'red.500',
  },
  {
    value: '~$5.2M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket \u2014 revenue from blocks the sweeper was scheduled but never showed',
    color: 'orange.400',
  },
  {
    value: '675,927',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there \u2014 the system works most of the time',
    color: 'green.500',
  },
  {
    value: '18,029',
    label: 'Verified block segments',
    detail: 'Segments with ticket data cross-referenced against sweeper GPS records',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Jamaica Ave near 198th St, Queens \u2014 4,498 Tickets, Sweeper Skips 61%',
    borough: 'Queens',
    description:
      'This short Jamaica Ave block in Hollis is the single highest-ticketed segment in the entire dataset. The sweeper is scheduled Mon\u2013Sat but skips 61% of the time. Mondays, Wednesdays, and Fridays are the worst \u2014 skipped over 73% of the time. 4,498 tickets were issued over 10 months, an estimated $292K in fines.',
    stats: [
      { label: 'Skip rate', value: '61.1%', color: 'red.500' },
      { label: 'Tickets issued', value: '4,498', color: 'red.500' },
      { label: 'GPS visits recorded', value: '183', color: 'blue.500' },
    ],
    highlight: 'Mon=83% skip, Tue=41%, Wed=73%, Thu=42%, Fri=81%, Sat=47%. The sweeper alternates between showing up and not, but MWF are nearly phantom routes.',
  },
  {
    title: 'Queens Blvd near 90th St, Elmhurst \u2014 Wednesday & Saturday Nearly Always Skipped',
    borough: 'Queens',
    description:
      'One of NYC\'s busiest boulevards. This block racks up 277 tickets while being skipped 67% of the time. Wednesday and Saturday sweeps are nearly phantom \u2014 98% and 94% skip rates respectively. Other days fare only marginally better.',
    stats: [
      { label: 'Skip rate', value: '67.1%', color: 'red.500' },
      { label: 'Tickets issued', value: '277', color: 'red.500' },
      { label: 'GPS visits recorded', value: '139', color: 'blue.500' },
    ],
    highlight: 'Mon=70%, Tue=52%, Wed=98%, Thu=47%, Fri=42%, Sat=94%. Wednesday and Saturday the sweeper essentially never comes despite residents being required to move their cars.',
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
  { precinct: 102, total: 10490, noSweep: 3040, noSweepRate: 29.0 },
  { precinct: 41, total: 2617, noSweep: 496, noSweepRate: 19.0 },
  { precinct: 40, total: 4217, noSweep: 723, noSweepRate: 17.1 },
  { precinct: 101, total: 963, noSweep: 146, noSweepRate: 15.2 },
  { precinct: 42, total: 2562, noSweep: 387, noSweepRate: 15.1 },
  { precinct: 24, total: 20168, noSweep: 3009, noSweepRate: 14.9 },
  { precinct: 28, total: 6727, noSweep: 998, noSweepRate: 14.8 },
  { precinct: 33, total: 7469, noSweep: 1058, noSweepRate: 14.2 },
  { precinct: 6, total: 16967, noSweep: 2307, noSweepRate: 13.6 },
  { precinct: 78, total: 19505, noSweep: 2601, noSweepRate: 13.3 },
  { precinct: 115, total: 16013, noSweep: 2064, noSweepRate: 12.9 },
  { precinct: 103, total: 7832, noSweep: 1013, noSweepRate: 12.9 },
  { precinct: 77, total: 12141, noSweep: 1518, noSweepRate: 12.5 },
  { precinct: 13, total: 5496, noSweep: 678, noSweepRate: 12.3 },
  { precinct: 7, total: 4730, noSweep: 578, noSweepRate: 12.2 },
  { precinct: 52, total: 9685, noSweep: 1098, noSweepRate: 11.3 },
  { precinct: 26, total: 5936, noSweep: 671, noSweepRate: 11.3 },
  { precinct: 100, total: 251, noSweep: 28, noSweepRate: 11.2 },
  { precinct: 112, total: 10645, noSweep: 1189, noSweepRate: 11.2 },
  { precinct: 50, total: 1667, noSweep: 180, noSweepRate: 10.8 },
  { precinct: 109, total: 12861, noSweep: 1388, noSweepRate: 10.8 },
  { precinct: 94, total: 24382, noSweep: 2614, noSweepRate: 10.7 },
  { precinct: 84, total: 7290, noSweep: 769, noSweepRate: 10.5 },
  { precinct: 49, total: 4440, noSweep: 462, noSweepRate: 10.4 },
  { precinct: 90, total: 24313, noSweep: 2500, noSweepRate: 10.3 },
  { precinct: 14, total: 1959, noSweep: 202, noSweepRate: 10.3 },
  { precinct: 46, total: 6120, noSweep: 627, noSweepRate: 10.2 },
  { precinct: 1, total: 6612, noSweep: 666, noSweepRate: 10.1 },
  { precinct: 48, total: 5851, noSweep: 578, noSweepRate: 9.9 },
  { precinct: 20, total: 17015, noSweep: 1674, noSweepRate: 9.8 },
  { precinct: 63, total: 2320, noSweep: 226, noSweepRate: 9.7 },
  { precinct: 67, total: 9911, noSweep: 938, noSweepRate: 9.5 },
  { precinct: 73, total: 7960, noSweep: 756, noSweepRate: 9.5 },
  { precinct: 47, total: 4372, noSweep: 409, noSweepRate: 9.4 },
  { precinct: 114, total: 28098, noSweep: 2619, noSweepRate: 9.3 },
  { precinct: 44, total: 5372, noSweep: 492, noSweepRate: 9.2 },
  { precinct: 34, total: 6310, noSweep: 571, noSweepRate: 9.0 },
  { precinct: 60, total: 5825, noSweep: 496, noSweepRate: 8.5 },
  { precinct: 110, total: 8457, noSweep: 723, noSweepRate: 8.5 },
  { precinct: 19, total: 45045, noSweep: 3808, noSweepRate: 8.5 },
  { precinct: 32, total: 5104, noSweep: 433, noSweepRate: 8.5 },
  { precinct: 5, total: 3962, noSweep: 334, noSweepRate: 8.4 },
  { precinct: 79, total: 18106, noSweep: 1507, noSweepRate: 8.3 },
  { precinct: 30, total: 3370, noSweep: 280, noSweepRate: 8.3 },
  { precinct: 81, total: 7770, noSweep: 638, noSweepRate: 8.2 },
  { precinct: 83, total: 16473, noSweep: 1351, noSweepRate: 8.2 },
  { precinct: 10, total: 6209, noSweep: 507, noSweepRate: 8.2 },
  { precinct: 45, total: 1514, noSweep: 122, noSweepRate: 8.1 },
  { precinct: 71, total: 8435, noSweep: 647, noSweepRate: 7.7 },
  { precinct: 104, total: 15972, noSweep: 1231, noSweepRate: 7.7 },
  { precinct: 88, total: 13301, noSweep: 1012, noSweepRate: 7.6 },
  { precinct: 61, total: 9236, noSweep: 705, noSweepRate: 7.6 },
  { precinct: 108, total: 10256, noSweep: 764, noSweepRate: 7.4 },
  { precinct: 113, total: 1020, noSweep: 75, noSweepRate: 7.4 },
  { precinct: 43, total: 6565, noSweep: 460, noSweepRate: 7.0 },
  { precinct: 69, total: 7246, noSweep: 484, noSweepRate: 6.7 },
  { precinct: 72, total: 10723, noSweep: 703, noSweepRate: 6.6 },
  { precinct: 23, total: 11018, noSweep: 714, noSweepRate: 6.5 },
  { precinct: 9, total: 7645, noSweep: 495, noSweepRate: 6.5 },
  { precinct: 70, total: 15388, noSweep: 954, noSweepRate: 6.2 },
  { precinct: 75, total: 13002, noSweep: 803, noSweepRate: 6.2 },
  { precinct: 107, total: 6915, noSweep: 414, noSweepRate: 6.0 },
  { precinct: 62, total: 14405, noSweep: 780, noSweepRate: 5.4 },
  { precinct: 25, total: 4810, noSweep: 250, noSweepRate: 5.2 },
  { precinct: 17, total: 1223, noSweep: 56, noSweepRate: 4.6 },
  { precinct: 66, total: 14283, noSweep: 640, noSweepRate: 4.5 },
  { precinct: 18, total: 1842, noSweep: 80, noSweepRate: 4.3 },
  { precinct: 68, total: 9810, noSweep: 408, noSweepRate: 4.2 },
  { precinct: 76, total: 9015, noSweep: 348, noSweepRate: 3.9 },
  { precinct: 116, total: 74, noSweep: 2, noSweepRate: 2.7 },
  { precinct: 105, total: 631, noSweep: 16, noSweepRate: 2.5 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 18029,
  confirmedSweepTickets: 675927,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 831K+ parking tickets against DSNY\u2019s own GPS records across 18,029 street segments. A ticket is classified as "no sweep" only if it falls on a day-of-week where GPS has historically confirmed the sweeper visits that specific side of the street, but the sweeper didn\u2019t show up that particular date. This filters out ~76K tickets issued on days that appear to be the opposite curb\u2019s ASP schedule. Day-of-week analysis uses 319 days of Mon\u2013Sat data.',
  dataCleaning:
    'Each CSCL segment represents one side of one block. ASP signs from the NYC DOT database can include rules for both curbs, so we use GPS data to determine which days the sweeper actually services each side. Per-block skip rates use only days-of-week where GPS has detected the sweeper at least once. Tickets on non-GPS-active days are excluded from no-sweep counts since they likely reflect the opposite curb\u2019s schedule. Some CSCL segments overlap geographically (e.g. service roads on wide boulevards), which can cause GPS to register on different physical IDs over time \u2014 segments with zero confirmed sweep-day tickets are excluded from worst-block rankings.',
};
