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
  wrongWindow: number;
  noSweepRate: number;
}

export const HEADLINE_STATS: HeadlineStat[] = [
  {
    value: '153,341',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on blocks with zero sweeper GPS activity that day',
    color: 'red.500',
  },
  {
    value: '~$14M',
    label: 'Annual fines on unswept blocks',
    detail: 'Revenue from ticketing blocks the sweeper never visited',
    color: 'orange.400',
  },
  {
    value: '595,770',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there — proving the system works',
    color: 'green.500',
  },
  {
    value: '17,900+',
    label: 'Block segments tracked',
    detail: '8 months of GPS and ticket data across all 5 boroughs',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Lincoln Ave, Bronx — The Smoking Gun',
    borough: 'Bronx',
    description:
      'On June 12, 2025, two adjacent blocks on Lincoln Ave were both ticketed during the same 11:30 AM\u20131:00 PM ASP window. GPS data shows the sweeper truck cleaned one block but never drove down the next.',
    stats: [
      { label: 'Segment 58237 (houses 141\u2013157)', value: 'Sweep confirmed', color: 'green.500' },
      { label: 'Segment 58241 (houses 165\u2013173)', value: 'Zero GPS all day', color: 'red.500' },
      { label: 'Same street, same day, same ASP window', value: 'Both ticketed', color: 'orange.400' },
    ],
    highlight: 'The sweeper came to that stretch of the Bronx, cleaned one block, and skipped the next. Both blocks were ticketed.',
  },
  {
    title: 'Barnes Ave, Bronx — 96% Skip Rate',
    borough: 'Bronx',
    description:
      'This block was scheduled for sweeping 107 times over 8 months. The sweeper showed up just 4 times. Meanwhile, 492 tickets were issued on the 103 days the sweeper never came.',
    stats: [
      { label: 'Skip rate', value: '96.3%', color: 'red.500' },
      { label: 'Days swept', value: '4 of 107' },
      { label: 'Tickets on skip days', value: '492', color: 'red.500' },
    ],
  },
  {
    title: 'Eastern Parkway, Brooklyn — Chronic Skip',
    borough: 'Brooklyn',
    description:
      'Across 8+ observed ASP dates spanning June through September 2025, this segment had zero GPS records from any sweeper truck on every single date. The sweeper never came once.',
    stats: [
      { label: 'Skip rate', value: '87.5%', color: 'red.500' },
      { label: 'Dates observed with tickets', value: '8+' },
      { label: 'Tickets on skip days', value: '55', color: 'red.500' },
    ],
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 112, total: 15481, noSweep: 6135, wrongWindow: 1484, noSweepRate: 39.6 },
  { precinct: 102, total: 8762, noSweep: 2862, wrongWindow: 1939, noSweepRate: 32.7 },
  { precinct: 33, total: 7332, noSweep: 2381, wrongWindow: 512, noSweepRate: 32.5 },
  { precinct: 63, total: 3848, noSweep: 1081, wrongWindow: 285, noSweepRate: 28.1 },
  { precinct: 41, total: 3793, noSweep: 1024, wrongWindow: 339, noSweepRate: 27.0 },
  { precinct: 50, total: 2413, noSweep: 648, wrongWindow: 178, noSweepRate: 26.9 },
  { precinct: 30, total: 5130, noSweep: 1359, wrongWindow: 374, noSweepRate: 26.5 },
  { precinct: 67, total: 13866, noSweep: 3614, wrongWindow: 1192, noSweepRate: 26.1 },
  { precinct: 26, total: 10881, noSweep: 2833, wrongWindow: 1054, noSweepRate: 26.0 },
  { precinct: 103, total: 9627, noSweep: 2477, wrongWindow: 826, noSweepRate: 25.7 },
  { precinct: 40, total: 7102, noSweep: 1818, wrongWindow: 713, noSweepRate: 25.6 },
  { precinct: 66, total: 22241, noSweep: 5670, wrongWindow: 1590, noSweepRate: 25.5 },
  { precinct: 101, total: 1276, noSweep: 321, wrongWindow: 53, noSweepRate: 25.2 },
  { precinct: 61, total: 12790, noSweep: 3199, wrongWindow: 992, noSweepRate: 25.0 },
  { precinct: 72, total: 16370, noSweep: 3988, wrongWindow: 2438, noSweepRate: 24.4 },
  { precinct: 71, total: 10975, noSweep: 2656, wrongWindow: 1285, noSweepRate: 24.2 },
  { precinct: 44, total: 9526, noSweep: 2222, wrongWindow: 852, noSweepRate: 23.3 },
  { precinct: 78, total: 23403, noSweep: 5455, wrongWindow: 1467, noSweepRate: 23.3 },
  { precinct: 109, total: 13656, noSweep: 3141, wrongWindow: 1798, noSweepRate: 23.0 },
  { precinct: 115, total: 16124, noSweep: 3568, wrongWindow: 2067, noSweepRate: 22.1 },
  { precinct: 7, total: 6875, noSweep: 1489, wrongWindow: 632, noSweepRate: 21.7 },
  { precinct: 110, total: 11448, noSweep: 2475, wrongWindow: 934, noSweepRate: 21.6 },
  { precinct: 62, total: 18354, noSweep: 3939, wrongWindow: 1821, noSweepRate: 21.5 },
  { precinct: 46, total: 9571, noSweep: 2053, wrongWindow: 732, noSweepRate: 21.5 },
  { precinct: 49, total: 5600, noSweep: 1193, wrongWindow: 376, noSweepRate: 21.3 },
  { precinct: 60, total: 8369, noSweep: 1772, wrongWindow: 386, noSweepRate: 21.2 },
  { precinct: 32, total: 7923, noSweep: 1650, wrongWindow: 411, noSweepRate: 20.8 },
  { precinct: 84, total: 11037, noSweep: 2284, wrongWindow: 1538, noSweepRate: 20.7 },
  { precinct: 70, total: 17912, noSweep: 3664, wrongWindow: 1567, noSweepRate: 20.5 },
  { precinct: 28, total: 10136, noSweep: 2054, wrongWindow: 1063, noSweepRate: 20.3 },
  { precinct: 108, total: 12129, noSweep: 2437, wrongWindow: 818, noSweepRate: 20.1 },
  { precinct: 24, total: 24560, noSweep: 4881, wrongWindow: 2231, noSweepRate: 19.9 },
  { precinct: 52, total: 12813, noSweep: 2500, wrongWindow: 1269, noSweepRate: 19.5 },
  { precinct: 88, total: 17371, noSweep: 3373, wrongWindow: 1522, noSweepRate: 19.4 },
  { precinct: 47, total: 5070, noSweep: 984, wrongWindow: 345, noSweepRate: 19.4 },
  { precinct: 34, total: 8773, noSweep: 1674, wrongWindow: 1159, noSweepRate: 19.1 },
  { precinct: 13, total: 9519, noSweep: 1807, wrongWindow: 1110, noSweepRate: 19.0 },
  { precinct: 113, total: 989, noSweep: 186, wrongWindow: 21, noSweepRate: 18.8 },
  { precinct: 114, total: 30829, noSweep: 5498, wrongWindow: 1617, noSweepRate: 17.8 },
  { precinct: 20, total: 23142, noSweep: 4111, wrongWindow: 1624, noSweepRate: 17.8 },
  { precinct: 107, total: 9399, noSweep: 1661, wrongWindow: 721, noSweepRate: 17.7 },
  { precinct: 104, total: 17514, noSweep: 2940, wrongWindow: 1197, noSweepRate: 16.8 },
  { precinct: 90, total: 27535, noSweep: 4527, wrongWindow: 1974, noSweepRate: 16.4 },
  { precinct: 6, total: 18064, noSweep: 2863, wrongWindow: 462, noSweepRate: 15.8 },
  { precinct: 68, total: 11557, noSweep: 1764, wrongWindow: 875, noSweepRate: 15.3 },
  { precinct: 69, total: 8250, noSweep: 1222, wrongWindow: 420, noSweepRate: 14.8 },
  { precinct: 73, total: 10198, noSweep: 1501, wrongWindow: 559, noSweepRate: 14.7 },
  { precinct: 77, total: 18073, noSweep: 2618, wrongWindow: 3022, noSweepRate: 14.5 },
  { precinct: 83, total: 18067, noSweep: 2617, wrongWindow: 1060, noSweepRate: 14.5 },
  { precinct: 14, total: 1566, noSweep: 224, wrongWindow: 58, noSweepRate: 14.3 },
  { precinct: 1, total: 7526, noSweep: 1072, wrongWindow: 264, noSweepRate: 14.2 },
  { precinct: 94, total: 26407, noSweep: 3748, wrongWindow: 949, noSweepRate: 14.2 },
  { precinct: 75, total: 17153, noSweep: 2413, wrongWindow: 1933, noSweepRate: 14.1 },
  { precinct: 42, total: 3308, noSweep: 442, wrongWindow: 595, noSweepRate: 13.4 },
  { precinct: 45, total: 1772, noSweep: 231, wrongWindow: 94, noSweepRate: 13.0 },
  { precinct: 43, total: 8805, noSweep: 1120, wrongWindow: 882, noSweepRate: 12.7 },
  { precinct: 9, total: 11399, noSweep: 1422, wrongWindow: 2377, noSweepRate: 12.5 },
  { precinct: 105, total: 595, noSweep: 73, wrongWindow: 114, noSweepRate: 12.3 },
  { precinct: 76, total: 11672, noSweep: 1414, wrongWindow: 983, noSweepRate: 12.1 },
  { precinct: 5, total: 3169, noSweep: 377, wrongWindow: 288, noSweepRate: 11.9 },
  { precinct: 23, total: 12442, noSweep: 1473, wrongWindow: 955, noSweepRate: 11.8 },
  { precinct: 79, total: 19526, noSweep: 2230, wrongWindow: 2476, noSweepRate: 11.4 },
  { precinct: 81, total: 6912, noSweep: 777, wrongWindow: 553, noSweepRate: 11.2 },
  { precinct: 0, total: 2450, noSweep: 266, wrongWindow: 216, noSweepRate: 10.9 },
  { precinct: 48, total: 8907, noSweep: 956, wrongWindow: 1249, noSweepRate: 10.7 },
  { precinct: 19, total: 52582, noSweep: 5454, wrongWindow: 2662, noSweepRate: 10.4 },
  { precinct: 10, total: 6349, noSweep: 555, wrongWindow: 82, noSweepRate: 8.7 },
  { precinct: 17, total: 1544, noSweep: 134, wrongWindow: 78, noSweepRate: 8.7 },
  { precinct: 25, total: 7189, noSweep: 518, wrongWindow: 631, noSweepRate: 7.2 },
  { precinct: 18, total: 1812, noSweep: 110, wrongWindow: 70, noSweepRate: 6.1 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 17900,
  confirmedSweepTickets: 595770,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4)',
  methodology:
    'A "no sweep" classification means zero GPS records from any DSNY mechanical broom were associated with that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, even without sweeping the curb, it would still register. We cross-referenced 1M+ parking tickets against DSNY\u2019s own GPS records to identify blocks where tickets were issued but no sweeper ever arrived.',
};
