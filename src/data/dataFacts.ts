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
    value: '28,304',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on verified single-block segments with zero sweeper GPS that day',
    color: 'red.500',
  },
  {
    value: '~$1.8M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket — revenue from blocks the sweeper never visited',
    color: 'orange.400',
  },
  {
    value: '155,592',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there — the system works most of the time',
    color: 'green.500',
  },
  {
    value: '4,136',
    label: 'Verified block segments',
    detail: 'Single-precinct blocks where GPS matching is proven to work in both directions',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Waverly Ave, Brooklyn \u2014 One Block Skipped on a Well-Swept Street',
    borough: 'Brooklyn',
    description:
      'Waverly Ave in Fort Greene has 5 verified blocks, all in Precinct 88. Three neighboring blocks (houses 157\u2013324) are swept reliably with 3\u20136% skip rates. But one block (houses 382\u2013450) is skipped 93% of the time \u2014 with 166 tickets issued on days the sweeper never came, and only 13 confirmed sweeps over 8 months.',
    stats: [
      { label: 'Skip rate (this block)', value: '92.7%', color: 'red.500' },
      { label: 'Three neighbor blocks', value: '3\u20136% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '166', color: 'red.500' },
    ],
    highlight: 'Three blocks swept 95%+ of the time, one block skipped 93%. Same street, same precinct, same sweeper route.',
  },
  {
    title: 'E 78th St, Manhattan \u2014 Eight Blocks Swept, One Chronically Missed',
    borough: 'Manhattan',
    description:
      'East 78th Street has 9 verified blocks in Precinct 19. Eight of them have skip rates between 10\u201313% \u2014 normal variation. One block (houses 527\u2013539, near York Ave) jumps to 73.5%, with 61 tickets on days the sweeper never appeared and only 22 confirmed sweeps.',
    stats: [
      { label: 'Skip rate (this block)', value: '73.5%', color: 'red.500' },
      { label: 'Eight neighbor blocks', value: '10\u201313% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '61', color: 'red.500' },
    ],
    highlight: 'Nine blocks, same street, same precinct. Eight swept consistently. One skipped three-quarters of the time.',
  },
  {
    title: 'Morrison Ave, Bronx \u2014 Neighbor Gets Swept, This Block Doesn\u2019t',
    borough: 'Bronx',
    description:
      'Morrison Ave in Soundview has two verified blocks in Precinct 43. The neighboring block (houses 1302\u20131356) is swept reliably at an 8.5% skip rate with 43 confirmed sweeps. But the block at houses 1075\u20131183 is skipped 92% of the time \u2014 only 4 confirmed sweeps vs. 44 tickets on days with zero sweeper GPS.',
    stats: [
      { label: 'Skip rate (this block)', value: '91.7%', color: 'red.500' },
      { label: 'Neighboring block', value: '8.5% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '44', color: 'red.500' },
    ],
    highlight: 'Same street, same precinct. One block swept, one block skipped. 44 tickets at $65 each = $2,860 in fines on a block the sweeper never visited.',
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 45, total: 72, noSweep: 32, noSweepRate: 44.4 },
  { precinct: 42, total: 137, noSweep: 53, noSweepRate: 38.7 },
  { precinct: 41, total: 1198, noSweep: 399, noSweepRate: 33.3 },
  { precinct: 63, total: 469, noSweep: 134, noSweepRate: 28.6 },
  { precinct: 33, total: 1971, noSweep: 521, noSweepRate: 26.4 },
  { precinct: 113, total: 195, noSweep: 51, noSweepRate: 26.2 },
  { precinct: 88, total: 2061, noSweep: 530, noSweepRate: 25.7 },
  { precinct: 50, total: 826, noSweep: 210, noSweepRate: 25.4 },
  { precinct: 101, total: 201, noSweep: 50, noSweepRate: 24.9 },
  { precinct: 60, total: 1769, noSweep: 417, noSweepRate: 23.6 },
  { precinct: 84, total: 1213, noSweep: 273, noSweepRate: 22.5 },
  { precinct: 40, total: 1913, noSweep: 420, noSweepRate: 22.0 },
  { precinct: 109, total: 6268, noSweep: 1376, noSweepRate: 22.0 },
  { precinct: 1, total: 2536, noSweep: 549, noSweepRate: 21.6 },
  { precinct: 73, total: 2771, noSweep: 594, noSweepRate: 21.4 },
  { precinct: 13, total: 164, noSweep: 35, noSweepRate: 21.3 },
  { precinct: 103, total: 1878, noSweep: 399, noSweepRate: 21.2 },
  { precinct: 44, total: 829, noSweep: 175, noSweepRate: 21.1 },
  { precinct: 26, total: 620, noSweep: 123, noSweepRate: 19.8 },
  { precinct: 110, total: 2608, noSweep: 480, noSweepRate: 18.4 },
  { precinct: 67, total: 1847, noSweep: 336, noSweepRate: 18.2 },
  { precinct: 7, total: 1196, noSweep: 216, noSweepRate: 18.1 },
  { precinct: 70, total: 2128, noSweep: 381, noSweepRate: 17.9 },
  { precinct: 75, total: 4632, noSweep: 829, noSweepRate: 17.9 },
  { precinct: 115, total: 4008, noSweep: 717, noSweepRate: 17.9 },
  { precinct: 69, total: 1780, noSweep: 316, noSweepRate: 17.8 },
  { precinct: 78, total: 8357, noSweep: 1479, noSweepRate: 17.7 },
  { precinct: 43, total: 1863, noSweep: 328, noSweepRate: 17.6 },
  { precinct: 107, total: 1764, noSweep: 304, noSweepRate: 17.2 },
  { precinct: 28, total: 662, noSweep: 112, noSweepRate: 16.9 },
  { precinct: 34, total: 2514, noSweep: 417, noSweepRate: 16.6 },
  { precinct: 94, total: 8919, noSweep: 1468, noSweepRate: 16.5 },
  { precinct: 6, total: 5495, noSweep: 901, noSweepRate: 16.4 },
  { precinct: 77, total: 2571, noSweep: 412, noSweepRate: 16.0 },
  { precinct: 24, total: 4270, noSweep: 676, noSweepRate: 15.8 },
  { precinct: 47, total: 1685, noSweep: 262, noSweepRate: 15.5 },
  { precinct: 52, total: 3838, noSweep: 594, noSweepRate: 15.5 },
  { precinct: 81, total: 878, noSweep: 136, noSweepRate: 15.5 },
  { precinct: 61, total: 2591, noSweep: 390, noSweepRate: 15.1 },
  { precinct: 71, total: 2125, noSweep: 321, noSweepRate: 15.1 },
  { precinct: 68, total: 2421, noSweep: 354, noSweepRate: 14.6 },
  { precinct: 102, total: 962, noSweep: 140, noSweepRate: 14.6 },
  { precinct: 90, total: 8770, noSweep: 1268, noSweepRate: 14.5 },
  { precinct: 112, total: 3883, noSweep: 562, noSweepRate: 14.5 },
  { precinct: 46, total: 654, noSweep: 92, noSweepRate: 14.1 },
  { precinct: 48, total: 1910, noSweep: 265, noSweepRate: 13.9 },
  { precinct: 83, total: 6100, noSweep: 847, noSweepRate: 13.9 },
  { precinct: 49, total: 1045, noSweep: 144, noSweepRate: 13.8 },
  { precinct: 79, total: 2633, noSweep: 344, noSweepRate: 13.1 },
  { precinct: 62, total: 3479, noSweep: 446, noSweepRate: 12.8 },
  { precinct: 108, total: 3202, noSweep: 408, noSweepRate: 12.7 },
  { precinct: 72, total: 3052, noSweep: 377, noSweepRate: 12.4 },
  { precinct: 9, total: 860, noSweep: 105, noSweepRate: 12.2 },
  { precinct: 32, total: 1083, noSweep: 131, noSweepRate: 12.1 },
  { precinct: 23, total: 2426, noSweep: 246, noSweepRate: 10.1 },
  { precinct: 66, total: 3938, noSweep: 388, noSweepRate: 9.9 },
  { precinct: 104, total: 5749, noSweep: 539, noSweepRate: 9.4 },
  { precinct: 19, total: 23223, noSweep: 2136, noSweepRate: 9.2 },
  { precinct: 20, total: 3532, noSweep: 319, noSweepRate: 9.0 },
  { precinct: 25, total: 568, noSweep: 51, noSweepRate: 9.0 },
  { precinct: 114, total: 15747, noSweep: 1383, noSweepRate: 8.8 },
  { precinct: 76, total: 2112, noSweep: 178, noSweepRate: 8.4 },
  { precinct: 30, total: 424, noSweep: 35, noSweepRate: 8.3 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 4136,
  confirmedSweepTickets: 155592,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4)',
  methodology:
    'We cross-referenced 1M+ parking tickets against DSNY\u2019s own GPS records. A "no sweep" classification means zero GPS from any DSNY mechanical broom was associated with that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register.',
  dataCleaning:
    'We applied the strictest possible filters: (1) Only single-block segments with tight house number ranges (under 200) and a single police precinct. (2) Only segments where GPS matching is proven to work in BOTH directions \u2014 meaning the same segment has days with confirmed sweeper GPS AND days with zero GPS. This eliminates segments with broken ticket-to-street mapping. (3) Minimum 5 tickets per segment to avoid flukes. After this filtering, 4,136 out of 20,000+ segments remain.',
};
