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
    value: '40,894',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on verified single-block segments with zero sweeper GPS that day',
    color: 'red.500',
  },
  {
    value: '~$2.66M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket — revenue from blocks the sweeper never visited',
    color: 'orange.400',
  },
  {
    value: '225,122',
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
  totalSegments: 6446,
  confirmedSweepTickets: 225122,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4)',
  methodology:
    'We cross-referenced 1M+ parking tickets against DSNY\u2019s own GPS records. A "no sweep" classification means zero GPS from any DSNY mechanical broom was associated with that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register.',
  dataCleaning:
    'We applied the strictest possible filters: (1) Only single-block segments with tight house number ranges (under 200) and a single police precinct. (2) Only segments where GPS matching is proven to work in BOTH directions \u2014 meaning the same segment has days with confirmed sweeper GPS AND days with zero GPS. This eliminates segments with broken ticket-to-street mapping. (3) Minimum 5 tickets per segment to avoid flukes. (4) Tickets must fall within the CSCL centerline\u2019s official house number range for the segment \u2014 no fallback matching. (5) Tiny segments (house range under 30) are reclassified as swept when adjacent blocks on the same street show confirmed sweeps that day \u2014 GPS pings too infrequently to register on very short blocks. After this filtering, 6,446 out of 20,000+ segments remain.',
};
