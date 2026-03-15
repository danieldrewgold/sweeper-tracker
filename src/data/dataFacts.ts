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
    value: '130,751',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on days with zero sweeper GPS activity for that block',
    color: 'red.500',
  },
  {
    value: '~$8.5M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket \u2014 revenue from blocks the sweeper never visited that day',
    color: 'orange.400',
  },
  {
    value: '597,806',
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
  { precinct: 45, total: 242, noSweep: 124, noSweepRate: 51.2 },
  { precinct: 13, total: 656, noSweep: 233, noSweepRate: 35.5 },
  { precinct: 41, total: 1680, noSweep: 514, noSweepRate: 30.6 },
  { precinct: 33, total: 2773, noSweep: 784, noSweepRate: 28.3 },
  { precinct: 28, total: 1380, noSweep: 378, noSweepRate: 27.4 },
  { precinct: 30, total: 991, noSweep: 259, noSweepRate: 26.1 },
  { precinct: 60, total: 2803, noSweep: 684, noSweepRate: 24.4 },
  { precinct: 103, total: 2980, noSweep: 703, noSweepRate: 23.6 },
  { precinct: 101, total: 223, noSweep: 52, noSweepRate: 23.3 },
  { precinct: 42, total: 656, noSweep: 141, noSweepRate: 21.5 },
  { precinct: 63, total: 1109, noSweep: 236, noSweepRate: 21.3 },
  { precinct: 88, total: 3275, noSweep: 690, noSweepRate: 21.1 },
  { precinct: 44, total: 2086, noSweep: 434, noSweepRate: 20.8 },
  { precinct: 113, total: 436, noSweep: 89, noSweepRate: 20.4 },
  { precinct: 1, total: 2899, noSweep: 567, noSweepRate: 19.6 },
  { precinct: 40, total: 2654, noSweep: 521, noSweepRate: 19.6 },
  { precinct: 32, total: 1976, noSweep: 383, noSweepRate: 19.4 },
  { precinct: 50, total: 790, noSweep: 152, noSweepRate: 19.2 },
  { precinct: 73, total: 4429, noSweep: 847, noSweepRate: 19.1 },
  { precinct: 71, total: 3590, noSweep: 683, noSweepRate: 19 },
  { precinct: 109, total: 9232, noSweep: 1757, noSweepRate: 19 },
  { precinct: 26, total: 1593, noSweep: 299, noSweepRate: 18.8 },
  { precinct: 67, total: 3363, noSweep: 606, noSweepRate: 18 },
  { precinct: 84, total: 1907, noSweep: 342, noSweepRate: 17.9 },
  { precinct: 78, total: 9895, noSweep: 1736, noSweepRate: 17.5 },
  { precinct: 110, total: 4221, noSweep: 727, noSweepRate: 17.2 },
  { precinct: 69, total: 2213, noSweep: 374, noSweepRate: 16.9 },
  { precinct: 107, total: 3259, noSweep: 551, noSweepRate: 16.9 },
  { precinct: 115, total: 7033, noSweep: 1152, noSweepRate: 16.4 },
  { precinct: 7, total: 1465, noSweep: 239, noSweepRate: 16.3 },
  { precinct: 61, total: 4713, noSweep: 759, noSweepRate: 16.1 },
  { precinct: 43, total: 2803, noSweep: 449, noSweepRate: 16 },
  { precinct: 47, total: 1965, noSweep: 312, noSweepRate: 15.9 },
  { precinct: 48, total: 2774, noSweep: 438, noSweepRate: 15.8 },
  { precinct: 81, total: 1181, noSweep: 184, noSweepRate: 15.6 },
  { precinct: 52, total: 5164, noSweep: 800, noSweepRate: 15.5 },
  { precinct: 72, total: 5587, noSweep: 866, noSweepRate: 15.5 },
  { precinct: 24, total: 5021, noSweep: 770, noSweepRate: 15.3 },
  { precinct: 77, total: 4676, noSweep: 717, noSweepRate: 15.3 },
  { precinct: 6, total: 6217, noSweep: 942, noSweepRate: 15.2 },
  { precinct: 75, total: 5967, noSweep: 892, noSweepRate: 14.9 },
  { precinct: 46, total: 1112, noSweep: 164, noSweepRate: 14.7 },
  { precinct: 94, total: 11134, noSweep: 1642, noSweepRate: 14.7 },
  { precinct: 108, total: 4751, noSweep: 672, noSweepRate: 14.1 },
  { precinct: 105, total: 420, noSweep: 58, noSweepRate: 13.8 },
  { precinct: 49, total: 1443, noSweep: 197, noSweepRate: 13.7 },
  { precinct: 83, total: 7463, noSweep: 1024, noSweepRate: 13.7 },
  { precinct: 70, total: 3521, noSweep: 476, noSweepRate: 13.5 },
  { precinct: 68, total: 3279, noSweep: 418, noSweepRate: 12.7 },
  { precinct: 90, total: 11034, noSweep: 1398, noSweepRate: 12.7 },
  { precinct: 19, total: 33787, noSweep: 4079, noSweepRate: 12.1 },
  { precinct: 79, total: 3704, noSweep: 449, noSweepRate: 12.1 },
  { precinct: 20, total: 5889, noSweep: 664, noSweepRate: 11.3 },
  { precinct: 34, total: 3106, noSweep: 345, noSweepRate: 11.1 },
  { precinct: 62, total: 5058, noSweep: 563, noSweepRate: 11.1 },
  { precinct: 9, total: 1139, noSweep: 125, noSweepRate: 11 },
  { precinct: 66, total: 7520, noSweep: 825, noSweepRate: 11 },
  { precinct: 102, total: 2572, noSweep: 279, noSweepRate: 10.8 },
  { precinct: 112, total: 6778, noSweep: 731, noSweepRate: 10.8 },
  { precinct: 104, total: 7063, noSweep: 717, noSweepRate: 10.2 },
  { precinct: 23, total: 3161, noSweep: 320, noSweepRate: 10.1 },
  { precinct: 114, total: 20637, noSweep: 1994, noSweepRate: 9.7 },
  { precinct: 25, total: 650, noSweep: 59, noSweepRate: 9.1 },
  { precinct: 76, total: 2256, noSweep: 166, noSweepRate: 7.4 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 18029,
  confirmedSweepTickets: 597806,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 728K+ parking tickets against DSNY\u2019s own GPS records across 18,029 street segments. A "no sweep" classification means zero GPS from any DSNY mechanical broom was detected on that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register. Day-of-week analysis uses 319 days of data (Mon\u2013Sat) to identify which specific days are routinely skipped.',
  dataCleaning:
    'Tickets are matched to CSCL centerline segments using street name and house number ranges. GPS sweep records are matched by physical_id. Skip rates are computed only over days-of-week where the sweeper has been observed at least once (eliminating false 0% rates on non-scheduled days). Segments with fewer than 10 GPS observations are excluded from sweep-only analysis.',
};
