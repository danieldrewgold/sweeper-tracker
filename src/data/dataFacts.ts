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
    value: '67,811',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on scheduled sweep days where GPS confirmed no sweeper visited that side of the street',
    color: 'red.500',
  },
  {
    value: '~$4.4M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket \u2014 revenue from blocks the sweeper was scheduled but never showed',
    color: 'orange.400',
  },
  {
    value: '594,242',
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
  { precinct: 102, total: 9688, noSweep: 3079, noSweepRate: 31.8 },
  { precinct: 87, total: 44, noSweep: 13, noSweepRate: 29.5 },
  { precinct: 89, total: 10, noSweep: 2, noSweepRate: 20.0 },
  { precinct: 105, total: 637, noSweep: 120, noSweepRate: 18.8 },
  { precinct: 41, total: 3810, noSweep: 706, noSweepRate: 18.5 },
  { precinct: 101, total: 985, noSweep: 179, noSweepRate: 18.2 },
  { precinct: 115, total: 16094, noSweep: 2774, noSweepRate: 17.2 },
  { precinct: 40, total: 8838, noSweep: 1475, noSweepRate: 16.7 },
  { precinct: 42, total: 3585, noSweep: 594, noSweepRate: 16.6 },
  { precinct: 28, total: 6681, noSweep: 1101, noSweepRate: 16.5 },
  { precinct: 52, total: 11239, noSweep: 1816, noSweepRate: 16.2 },
  { precinct: 33, total: 7467, noSweep: 1189, noSweepRate: 15.9 },
  { precinct: 103, total: 7854, noSweep: 1230, noSweepRate: 15.7 },
  { precinct: 72, total: 10804, noSweep: 1684, noSweepRate: 15.6 },
  { precinct: 24, total: 20235, noSweep: 3136, noSweepRate: 15.5 },
  { precinct: 77, total: 12106, noSweep: 1873, noSweepRate: 15.5 },
  { precinct: 34, total: 6445, noSweep: 971, noSweepRate: 15.1 },
  { precinct: 45, total: 2827, noSweep: 426, noSweepRate: 15.1 },
  { precinct: 112, total: 10823, noSweep: 1614, noSweepRate: 14.9 },
  { precinct: 78, total: 19613, noSweep: 2899, noSweepRate: 14.8 },
  { precinct: 100, total: 257, noSweep: 38, noSweepRate: 14.8 },
  { precinct: 84, total: 7401, noSweep: 1060, noSweepRate: 14.3 },
  { precinct: 6, total: 16956, noSweep: 2388, noSweepRate: 14.1 },
  { precinct: 44, total: 6766, noSweep: 954, noSweepRate: 14.1 },
  { precinct: 13, total: 5490, noSweep: 767, noSweepRate: 14.0 },
  { precinct: 7, total: 4867, noSweep: 667, noSweepRate: 13.7 },
  { precinct: 109, total: 12965, noSweep: 1679, noSweepRate: 13.0 },
  { precinct: 50, total: 3073, noSweep: 391, noSweepRate: 12.7 },
  { precinct: 67, total: 9602, noSweep: 1224, noSweepRate: 12.7 },
  { precinct: 63, total: 2370, noSweep: 299, noSweepRate: 12.6 },
  { precinct: 73, total: 8519, noSweep: 1072, noSweepRate: 12.6 },
  { precinct: 90, total: 24607, noSweep: 3094, noSweepRate: 12.6 },
  { precinct: 48, total: 6820, noSweep: 851, noSweepRate: 12.5 },
  { precinct: 75, total: 13570, noSweep: 1700, noSweepRate: 12.5 },
  { precinct: 46, total: 7917, noSweep: 982, noSweepRate: 12.4 },
  { precinct: 49, total: 6237, noSweep: 772, noSweepRate: 12.4 },
  { precinct: 94, total: 24446, noSweep: 3037, noSweepRate: 12.4 },
  { precinct: 81, total: 6256, noSweep: 734, noSweepRate: 11.7 },
  { precinct: 26, total: 5927, noSweep: 685, noSweepRate: 11.6 },
  { precinct: 83, total: 15220, noSweep: 1746, noSweepRate: 11.5 },
  { precinct: 110, total: 8562, noSweep: 985, noSweepRate: 11.5 },
  { precinct: 79, total: 17463, noSweep: 1987, noSweepRate: 11.4 },
  { precinct: 61, total: 9372, noSweep: 1055, noSweepRate: 11.3 },
  { precinct: 17, total: 1222, noSweep: 137, noSweepRate: 11.2 },
  { precinct: 25, total: 4797, noSweep: 539, noSweepRate: 11.2 },
  { precinct: 71, total: 7427, noSweep: 833, noSweepRate: 11.2 },
  { precinct: 114, total: 28110, noSweep: 3138, noSweepRate: 11.2 },
  { precinct: 32, total: 5103, noSweep: 556, noSweepRate: 10.9 },
  { precinct: 1, total: 6607, noSweep: 716, noSweepRate: 10.8 },
  { precinct: 60, total: 5918, noSweep: 639, noSweepRate: 10.8 },
  { precinct: 104, total: 16151, noSweep: 1723, noSweepRate: 10.7 },
  { precinct: 108, total: 10314, noSweep: 1103, noSweepRate: 10.7 },
  { precinct: 88, total: 13442, noSweep: 1417, noSweepRate: 10.5 },
  { precinct: 14, total: 1954, noSweep: 203, noSweepRate: 10.4 },
  { precinct: 30, total: 3397, noSweep: 351, noSweepRate: 10.3 },
  { precinct: 5, total: 3999, noSweep: 409, noSweepRate: 10.2 },
  { precinct: 116, total: 98, noSweep: 10, noSweepRate: 10.2 },
  { precinct: 20, total: 17114, noSweep: 1734, noSweepRate: 10.1 },
  { precinct: 43, total: 10312, noSweep: 1011, noSweepRate: 9.8 },
  { precinct: 19, total: 44942, noSweep: 4350, noSweepRate: 9.7 },
  { precinct: 47, total: 6659, noSweep: 638, noSweepRate: 9.6 },
  { precinct: 113, total: 1115, noSweep: 105, noSweepRate: 9.4 },
  { precinct: 62, total: 14436, noSweep: 1304, noSweepRate: 9.0 },
  { precinct: 107, total: 6944, noSweep: 624, noSweepRate: 9.0 },
  { precinct: 69, total: 7304, noSweep: 652, noSweepRate: 8.9 },
  { precinct: 68, total: 9962, noSweep: 860, noSweepRate: 8.6 },
  { precinct: 10, total: 6198, noSweep: 527, noSweepRate: 8.5 },
  { precinct: 23, total: 11026, noSweep: 938, noSweepRate: 8.5 },
  { precinct: 70, total: 15473, noSweep: 1267, noSweepRate: 8.2 },
  { precinct: 9, total: 7650, noSweep: 614, noSweepRate: 8.0 },
  { precinct: 66, total: 14374, noSweep: 1080, noSweepRate: 7.5 },
  { precinct: 76, total: 9120, noSweep: 649, noSweepRate: 7.1 },
  { precinct: 18, total: 1833, noSweep: 120, noSweepRate: 6.5 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 18029,
  confirmedSweepTickets: 594242,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 728K+ parking tickets against DSNY\u2019s own GPS records across 18,029 street segments. A ticket is classified as "no sweep" only if it falls on a day-of-week where GPS has historically confirmed the sweeper visits that specific side of the street, but the sweeper didn\u2019t show up that particular date. This filters out ~29K tickets issued on days that appear to be the opposite curb\u2019s ASP schedule. Day-of-week analysis uses 319 days of Mon\u2013Sat data.',
  dataCleaning:
    'Each CSCL segment represents one side of one block. ASP signs from the NYC DOT database can include rules for both curbs, so we use GPS data to determine which days the sweeper actually services each side. Per-block skip rates use only days-of-week where GPS has detected the sweeper at least once. Tickets on non-GPS-active days are excluded from no-sweep counts since they likely reflect the opposite curb\u2019s schedule. Some CSCL segments overlap geographically (e.g. service roads on wide boulevards), which can cause GPS to register on different physical IDs over time \u2014 segments with zero confirmed sweep-day tickets are excluded from worst-block rankings.',
};
