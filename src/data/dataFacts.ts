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
    value: '41,929',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on verified single-block segments with zero sweeper GPS that day',
    color: 'red.500',
  },
  {
    value: '~$2.7M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket — revenue from blocks the sweeper never visited',
    color: 'orange.400',
  },
  {
    value: '224,087',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there — the system works most of the time',
    color: 'green.500',
  },
  {
    value: '6,446',
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
      'Waverly Ave in Fort Greene has verified blocks in Precinct 88. Neighboring blocks are swept reliably with 3\u20136% skip rates. But one block (houses 382\u2013450) is skipped 86% of the time \u2014 with 78 tickets issued on days the sweeper never came, and only 13 confirmed sweeps over 8 months.',
    stats: [
      { label: 'Skip rate (this block)', value: '85.7%', color: 'red.500' },
      { label: 'Neighbor blocks', value: '3\u20136% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '78', color: 'red.500' },
    ],
    highlight: 'Neighbor blocks swept 95%+ of the time, one block skipped 86%. Same street, same precinct, same sweeper route.',
  },
  {
    title: 'Clay St, Brooklyn \u2014 One Block Skipped, Next Block Swept',
    borough: 'Brooklyn',
    description:
      'Clay Street in Greenpoint has 2 verified blocks in Precinct 94. The block from houses 88\u2013116 is swept reliably with an 11% skip rate and 93 confirmed sweeps. But the adjacent block (houses 14\u201385) is skipped 82% of the time \u2014 92 tickets on days the sweeper never came, and only 20 confirmed sweeps over 8 months.',
    stats: [
      { label: 'Skip rate (this block)', value: '82.1%', color: 'red.500' },
      { label: 'Adjacent block', value: '11.4% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '92', color: 'red.500' },
    ],
    highlight: 'Two blocks on the same street, same precinct. One swept 89% of the time, the other skipped 82%. 92 tickets at $65 = $5,980 in fines on a block the sweeper rarely visited.',
  },
  {
    title: 'E 103rd St, Manhattan \u2014 93% Skipped While Neighbors Get Swept',
    borough: 'Manhattan',
    description:
      'East 103rd Street in East Harlem has 4 verified blocks in Precinct 23. Three neighboring blocks (houses 102\u2013351) are swept reliably with 6\u201310% skip rates and over 150 combined confirmed sweeps. But one block (houses 2\u201334) is skipped 93% of the time \u2014 66 tickets on days the sweeper never came, and only 5 confirmed sweeps.',
    stats: [
      { label: 'Skip rate (this block)', value: '93.0%', color: 'red.500' },
      { label: 'Three neighbor blocks', value: '6\u201310% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '66', color: 'red.500' },
    ],
    highlight: 'Same street, same precinct. Three blocks swept reliably, one block skipped 93%. 66 tickets at $65 each = $4,290 in fines on a block the sweeper never visited.',
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 45, total: 243, noSweep: 124, noSweepRate: 51 },
  { precinct: 13, total: 660, noSweep: 256, noSweepRate: 38.8 },
  { precinct: 41, total: 1695, noSweep: 518, noSweepRate: 30.6 },
  { precinct: 33, total: 2796, noSweep: 785, noSweepRate: 28.1 },
  { precinct: 28, total: 1392, noSweep: 380, noSweepRate: 27.3 },
  { precinct: 30, total: 994, noSweep: 265, noSweepRate: 26.7 },
  { precinct: 60, total: 2815, noSweep: 721, noSweepRate: 25.6 },
  { precinct: 103, total: 2983, noSweep: 703, noSweepRate: 23.6 },
  { precinct: 42, total: 657, noSweep: 149, noSweepRate: 22.7 },
  { precinct: 44, total: 2091, noSweep: 464, noSweepRate: 22.2 },
  { precinct: 63, total: 1110, noSweep: 245, noSweepRate: 22.1 },
  { precinct: 88, total: 3301, noSweep: 714, noSweepRate: 21.6 },
  { precinct: 40, total: 2661, noSweep: 572, noSweepRate: 21.5 },
  { precinct: 1, total: 2903, noSweep: 571, noSweepRate: 19.7 },
  { precinct: 32, total: 1983, noSweep: 390, noSweepRate: 19.7 },
  { precinct: 26, total: 1594, noSweep: 312, noSweepRate: 19.6 },
  { precinct: 50, total: 802, noSweep: 156, noSweepRate: 19.5 },
  { precinct: 73, total: 4442, noSweep: 860, noSweepRate: 19.4 },
  { precinct: 109, total: 9260, noSweep: 1757, noSweepRate: 19 },
  { precinct: 84, total: 1921, noSweep: 359, noSweepRate: 18.7 },
  { precinct: 71, total: 3739, noSweep: 695, noSweepRate: 18.6 },
  { precinct: 67, total: 3368, noSweep: 620, noSweepRate: 18.4 },
  { precinct: 69, total: 2219, noSweep: 398, noSweepRate: 17.9 },
  { precinct: 78, total: 9937, noSweep: 1743, noSweepRate: 17.5 },
  { precinct: 110, total: 4229, noSweep: 727, noSweepRate: 17.2 },
  { precinct: 107, total: 3271, noSweep: 551, noSweepRate: 16.8 },
  { precinct: 6, total: 6244, noSweep: 1034, noSweepRate: 16.6 },
  { precinct: 7, total: 1481, noSweep: 243, noSweepRate: 16.4 },
  { precinct: 43, total: 2819, noSweep: 461, noSweepRate: 16.4 },
  { precinct: 61, total: 4726, noSweep: 775, noSweepRate: 16.4 },
  { precinct: 115, total: 7055, noSweep: 1152, noSweepRate: 16.3 },
  { precinct: 52, total: 5197, noSweep: 839, noSweepRate: 16.1 },
  { precinct: 24, total: 5050, noSweep: 810, noSweepRate: 16 },
  { precinct: 47, total: 1967, noSweep: 313, noSweepRate: 15.9 },
  { precinct: 48, total: 2787, noSweep: 444, noSweepRate: 15.9 },
  { precinct: 72, total: 5602, noSweep: 869, noSweepRate: 15.5 },
  { precinct: 77, total: 4691, noSweep: 728, noSweepRate: 15.5 },
  { precinct: 81, total: 1191, noSweep: 184, noSweepRate: 15.4 },
  { precinct: 46, total: 1115, noSweep: 171, noSweepRate: 15.3 },
  { precinct: 75, total: 5988, noSweep: 913, noSweepRate: 15.2 },
  { precinct: 94, total: 11160, noSweep: 1677, noSweepRate: 15 },
  { precinct: 108, total: 4778, noSweep: 672, noSweepRate: 14.1 },
  { precinct: 90, total: 11073, noSweep: 1524, noSweepRate: 13.8 },
  { precinct: 9, total: 1145, noSweep: 157, noSweepRate: 13.7 },
  { precinct: 70, total: 3527, noSweep: 482, noSweepRate: 13.7 },
  { precinct: 49, total: 1446, noSweep: 197, noSweepRate: 13.6 },
  { precinct: 83, total: 7697, noSweep: 1027, noSweepRate: 13.3 },
  { precinct: 68, total: 3287, noSweep: 433, noSweepRate: 13.2 },
  { precinct: 79, total: 3725, noSweep: 469, noSweepRate: 12.6 },
  { precinct: 19, total: 33944, noSweep: 4196, noSweepRate: 12.4 },
  { precinct: 62, total: 5106, noSweep: 612, noSweepRate: 12 },
  { precinct: 34, total: 3126, noSweep: 363, noSweepRate: 11.6 },
  { precinct: 20, total: 5898, noSweep: 664, noSweepRate: 11.3 },
  { precinct: 66, total: 7535, noSweep: 834, noSweepRate: 11.1 },
  { precinct: 112, total: 6824, noSweep: 731, noSweepRate: 10.7 },
  { precinct: 102, total: 2691, noSweep: 279, noSweepRate: 10.4 },
  { precinct: 104, total: 7083, noSweep: 736, noSweepRate: 10.4 },
  { precinct: 23, total: 3172, noSweep: 326, noSweepRate: 10.3 },
  { precinct: 114, total: 20696, noSweep: 1994, noSweepRate: 9.6 },
  { precinct: 25, total: 657, noSweep: 62, noSweepRate: 9.4 },
  { precinct: 76, total: 2261, noSweep: 179, noSweepRate: 7.9 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 6446,
  confirmedSweepTickets: 224087,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4)',
  methodology:
    'We cross-referenced 1M+ parking tickets against DSNY\u2019s own GPS records. A "no sweep" classification means zero GPS from any DSNY mechanical broom was associated with that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register.',
  dataCleaning:
    'We applied the strictest possible filters: (1) Only single-block segments with tight house number ranges (under 200) and a single police precinct. (2) Only segments where GPS matching is proven to work in BOTH directions \u2014 meaning the same segment has days with confirmed sweeper GPS AND days with zero GPS. This eliminates segments with broken ticket-to-street mapping. (3) Minimum 5 tickets per segment to avoid flukes. (4) Tickets must fall within the CSCL centerline\u2019s official house number range for the segment \u2014 no fallback matching. After this filtering, 6,446 out of 20,000+ segments remain.',
};
