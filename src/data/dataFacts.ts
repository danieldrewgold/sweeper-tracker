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
  { precinct: 112, total: 16501, noSweep: 7610, noSweepRate: 46.1 },
  { precinct: 102, total: 9907, noSweep: 4319, noSweepRate: 43.6 },
  { precinct: 109, total: 13378, noSweep: 4427, noSweepRate: 33.1 },
  { precinct: 105, total: 877, noSweep: 286, noSweepRate: 32.6 },
  { precinct: 110, total: 12928, noSweep: 4114, noSweepRate: 31.8 },
  { precinct: 115, total: 15779, noSweep: 4273, noSweepRate: 27.1 },
  { precinct: 101, total: 1418, noSweep: 380, noSweepRate: 26.8 },
  { precinct: 103, total: 8624, noSweep: 2101, noSweepRate: 24.4 },
  { precinct: 7, total: 6022, noSweep: 1423, noSweepRate: 23.6 },
  { precinct: 33, total: 4737, noSweep: 1118, noSweepRate: 23.6 },
  { precinct: 34, total: 7076, noSweep: 1626, noSweepRate: 23.0 },
  { precinct: 113, total: 1105, noSweep: 252, noSweepRate: 22.8 },
  { precinct: 108, total: 11411, noSweep: 2587, noSweepRate: 22.7 },
  { precinct: 50, total: 3645, noSweep: 805, noSweepRate: 22.1 },
  { precinct: 41, total: 3710, noSweep: 808, noSweepRate: 21.8 },
  { precinct: 52, total: 11348, noSweep: 2473, noSweepRate: 21.8 },
  { precinct: 114, total: 30703, noSweep: 6504, noSweepRate: 21.2 },
  { precinct: 107, total: 8933, noSweep: 1876, noSweepRate: 21.0 },
  { precinct: 44, total: 7669, noSweep: 1604, noSweepRate: 20.9 },
  { precinct: 40, total: 11027, noSweep: 2251, noSweepRate: 20.4 },
  { precinct: 72, total: 11776, noSweep: 2406, noSweepRate: 20.4 },
  { precinct: 45, total: 3229, noSweep: 656, noSweepRate: 20.3 },
  { precinct: 104, total: 17147, noSweep: 3390, noSweepRate: 19.8 },
  { precinct: 48, total: 7149, noSweep: 1401, noSweepRate: 19.6 },
  { precinct: 13, total: 6169, noSweep: 1192, noSweepRate: 19.3 },
  { precinct: 84, total: 8218, noSweep: 1584, noSweepRate: 19.3 },
  { precinct: 77, total: 12209, noSweep: 2325, noSweepRate: 19.0 },
  { precinct: 78, total: 19682, noSweep: 3742, noSweepRate: 19.0 },
  { precinct: 49, total: 6776, noSweep: 1132, noSweepRate: 16.7 },
  { precinct: 63, total: 2203, noSweep: 369, noSweepRate: 16.7 },
  { precinct: 68, total: 10362, noSweep: 1734, noSweepRate: 16.7 },
  { precinct: 60, total: 6706, noSweep: 1113, noSweepRate: 16.6 },
  { precinct: 6, total: 17513, noSweep: 2859, noSweepRate: 16.3 },
  { precinct: 28, total: 6588, noSweep: 1075, noSweepRate: 16.3 },
  { precinct: 32, total: 5769, noSweep: 938, noSweepRate: 16.3 },
  { precinct: 62, total: 14127, noSweep: 2274, noSweepRate: 16.1 },
  { precinct: 26, total: 6258, noSweep: 985, noSweepRate: 15.7 },
  { precinct: 14, total: 1125, noSweep: 174, noSweepRate: 15.5 },
  { precinct: 24, total: 24168, noSweep: 3648, noSweepRate: 15.1 },
  { precinct: 61, total: 8813, noSweep: 1326, noSweepRate: 15.0 },
  { precinct: 67, total: 10591, noSweep: 1592, noSweepRate: 15.0 },
  { precinct: 42, total: 2817, noSweep: 418, noSweepRate: 14.8 },
  { precinct: 69, total: 7274, noSweep: 1080, noSweepRate: 14.8 },
  { precinct: 71, total: 8239, noSweep: 1222, noSweepRate: 14.8 },
  { precinct: 94, total: 25576, noSweep: 3792, noSweepRate: 14.8 },
  { precinct: 46, total: 8051, noSweep: 1176, noSweepRate: 14.6 },
  { precinct: 70, total: 14944, noSweep: 2154, noSweepRate: 14.4 },
  { precinct: 90, total: 24000, noSweep: 3444, noSweepRate: 14.4 },
  { precinct: 9, total: 7854, noSweep: 1124, noSweepRate: 14.3 },
  { precinct: 1, total: 6988, noSweep: 984, noSweepRate: 14.1 },
  { precinct: 83, total: 15703, noSweep: 2199, noSweepRate: 14.0 },
  { precinct: 88, total: 13738, noSweep: 1917, noSweepRate: 14.0 },
  { precinct: 47, total: 6502, noSweep: 903, noSweepRate: 13.9 },
  { precinct: 75, total: 13665, noSweep: 1902, noSweepRate: 13.9 },
  { precinct: 20, total: 17059, noSweep: 2285, noSweepRate: 13.4 },
  { precinct: 43, total: 10253, noSweep: 1376, noSweepRate: 13.4 },
  { precinct: 73, total: 8602, noSweep: 1126, noSweepRate: 13.1 },
  { precinct: 5, total: 2383, noSweep: 308, noSweepRate: 12.9 },
  { precinct: 79, total: 16882, noSweep: 2152, noSweepRate: 12.7 },
  { precinct: 66, total: 16266, noSweep: 2043, noSweepRate: 12.6 },
  { precinct: 81, total: 6218, noSweep: 770, noSweepRate: 12.4 },
  { precinct: 25, total: 5251, noSweep: 609, noSweepRate: 11.6 },
  { precinct: 76, total: 10261, noSweep: 1142, noSweepRate: 11.1 },
  { precinct: 19, total: 44805, noSweep: 4723, noSweepRate: 10.5 },
  { precinct: 23, total: 10750, noSweep: 1089, noSweepRate: 10.1 },
  { precinct: 30, total: 3425, noSweep: 332, noSweepRate: 9.7 },
  { precinct: 10, total: 7244, noSweep: 581, noSweepRate: 8.0 },
  { precinct: 18, total: 1494, noSweep: 107, noSweepRate: 7.2 },
  { precinct: 17, total: 933, noSweep: 62, noSweepRate: 6.6 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 18029,
  confirmedSweepTickets: 597806,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 728K+ parking tickets against DSNY\u2019s own GPS records across 18,029 street segments. A "no sweep" classification means zero GPS from any DSNY mechanical broom was detected on that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register. Day-of-week analysis uses 319 days of Mon\u2013Sat data to identify which specific days are routinely skipped.',
  dataCleaning:
    'Tickets are matched to CSCL centerline segments using street name and house number ranges. GPS sweep records are matched by physical_id. Per-block skip rates use only days-of-week where GPS has detected the sweeper at least once, since ASP signs can reflect both sides of a street while each segment is one side. This ensures a block with Thursday-only service isn\u2019t penalized for Mon\u2013Sat ASP signs that belong to the other side. Segments with fewer than 10 GPS observations are excluded from sweep-only analysis.',
};
