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
    value: '54,176',
    label: 'Tickets on unswept blocks',
    detail: 'Issued on verified single-block segments with zero sweeper GPS that day',
    color: 'red.500',
  },
  {
    value: '~$3.5M',
    label: 'Fines on unswept blocks',
    detail: 'At $65/ticket — revenue from blocks the sweeper never visited',
    color: 'orange.400',
  },
  {
    value: '416,224',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there — the system works most of the time',
    color: 'green.500',
  },
  {
    value: '15,500+',
    label: 'Verified block segments',
    detail: '8 months of GPS and ticket data, cleaned for data integrity',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Ditmars Blvd, Queens — The Outlier Block',
    borough: 'Queens',
    description:
      'Ditmars Blvd has 8 verified blocks. Seven are swept reliably (0\u20132.4% skip rate). One block \u2014 segment 23081 between houses 18 and 77 \u2014 is skipped 71% of the time with 453 tickets. Same street, same route, one block consistently missed.',
    stats: [
      { label: 'Skip rate (this block)', value: '71.2%', color: 'red.500' },
      { label: 'Neighboring blocks', value: '0\u20132.4% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '426', color: 'red.500' },
    ],
    highlight: 'Seven blocks swept perfectly, one chronically skipped. That pattern points to a route issue, not parked cars.',
  },
  {
    title: 'Rivington St, Manhattan — 93% Skip Rate',
    borough: 'Manhattan',
    description:
      'This single block (houses 166\u2013178, Precinct 7) was swept only 4 out of 57 scheduled days. Meanwhile, 10 blocks on the same street were swept reliably, with 7 at 0\u20133.8% skip rates.',
    stats: [
      { label: 'Skip rate', value: '93%', color: 'red.500' },
      { label: 'Days swept', value: '4 of 57' },
      { label: 'Tickets on skip days', value: '87', color: 'red.500' },
      { label: 'Avg tickets per skip day', value: '1.6', color: 'orange.400' },
    ],
    highlight: 'Only 1.6 tickets per skip day means most cars are moving for ASP. The block is clear \u2014 the sweeper just doesn\u2019t come.',
  },
  {
    title: '90th St, Queens — The One Block Gap',
    borough: 'Queens',
    description:
      'Of 7 verified blocks on 90th St in Queens, 6 have a 0% skip rate \u2014 the sweeper comes every single scheduled day. One block (houses 22\u201346) is skipped 71% of the time, with 288 tickets issued on days the sweeper never came.',
    stats: [
      { label: 'Skip rate (this block)', value: '70.7%', color: 'red.500' },
      { label: 'All 6 other blocks', value: '0% skip', color: 'green.500' },
      { label: 'Tickets on skip days', value: '288', color: 'red.500' },
    ],
    highlight: 'Six blocks at 0% skip, one at 71%. The sweeper is clearly running this route \u2014 it just misses one block every time.',
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 13, total: 1908, noSweep: 433, wrongWindow: 144, noSweepRate: 22.7 },
  { precinct: 0, total: 406, noSweep: 90, wrongWindow: 0, noSweepRate: 22.2 },
  { precinct: 41, total: 2979, noSweep: 590, wrongWindow: 164, noSweepRate: 19.8 },
  { precinct: 40, total: 5210, noSweep: 940, wrongWindow: 363, noSweepRate: 18.0 },
  { precinct: 33, total: 4879, noSweep: 840, wrongWindow: 176, noSweepRate: 17.2 },
  { precinct: 28, total: 3130, noSweep: 497, wrongWindow: 59, noSweepRate: 15.9 },
  { precinct: 103, total: 5903, noSweep: 941, wrongWindow: 235, noSweepRate: 15.9 },
  { precinct: 34, total: 6660, noSweep: 1023, wrongWindow: 652, noSweepRate: 15.4 },
  { precinct: 60, total: 5795, noSweep: 878, wrongWindow: 58, noSweepRate: 15.2 },
  { precinct: 101, total: 620, noSweep: 93, wrongWindow: 9, noSweepRate: 15.0 },
  { precinct: 78, total: 15959, noSweep: 2346, wrongWindow: 235, noSweepRate: 14.7 },
  { precinct: 24, total: 11065, noSweep: 1585, wrongWindow: 249, noSweepRate: 14.3 },
  { precinct: 115, total: 11475, noSweep: 1643, wrongWindow: 536, noSweepRate: 14.3 },
  { precinct: 109, total: 11281, noSweep: 1603, wrongWindow: 480, noSweepRate: 14.2 },
  { precinct: 26, total: 4583, noSweep: 634, wrongWindow: 167, noSweepRate: 13.8 },
  { precinct: 7, total: 3371, noSweep: 459, wrongWindow: 48, noSweepRate: 13.6 },
  { precinct: 1, total: 6693, noSweep: 890, wrongWindow: 79, noSweepRate: 13.3 },
  { precinct: 6, total: 14414, noSweep: 1878, wrongWindow: 163, noSweepRate: 13.0 },
  { precinct: 52, total: 9342, noSweep: 1215, wrongWindow: 674, noSweepRate: 13.0 },
  { precinct: 50, total: 2063, noSweep: 262, wrongWindow: 125, noSweepRate: 12.7 },
  { precinct: 94, total: 22575, noSweep: 2872, wrongWindow: 354, noSweepRate: 12.7 },
  { precinct: 44, total: 4495, noSweep: 555, wrongWindow: 304, noSweepRate: 12.3 },
  { precinct: 84, total: 5885, noSweep: 704, wrongWindow: 271, noSweepRate: 12.0 },
  { precinct: 9, total: 4026, noSweep: 465, wrongWindow: 321, noSweepRate: 11.5 },
  { precinct: 88, total: 10284, noSweep: 1147, wrongWindow: 166, noSweepRate: 11.2 },
  { precinct: 110, total: 8895, noSweep: 992, wrongWindow: 331, noSweepRate: 11.2 },
  { precinct: 47, total: 3931, noSweep: 432, wrongWindow: 101, noSweepRate: 11.0 },
  { precinct: 43, total: 7147, noSweep: 779, wrongWindow: 383, noSweepRate: 10.9 },
  { precinct: 77, total: 7845, noSweep: 845, wrongWindow: 281, noSweepRate: 10.8 },
  { precinct: 30, total: 1812, noSweep: 193, wrongWindow: 25, noSweepRate: 10.7 },
  { precinct: 90, total: 23004, noSweep: 2469, wrongWindow: 590, noSweepRate: 10.7 },
  { precinct: 49, total: 3678, noSweep: 379, wrongWindow: 152, noSweepRate: 10.3 },
  { precinct: 46, total: 4593, noSweep: 468, wrongWindow: 122, noSweepRate: 10.2 },
  { precinct: 73, total: 7625, noSweep: 780, wrongWindow: 183, noSweepRate: 10.2 },
  { precinct: 20, total: 11891, noSweep: 1203, wrongWindow: 96, noSweepRate: 10.1 },
  { precinct: 48, total: 4616, noSweep: 461, wrongWindow: 110, noSweepRate: 10.0 },
  { precinct: 61, total: 8886, noSweep: 862, wrongWindow: 235, noSweepRate: 9.7 },
  { precinct: 67, total: 7888, noSweep: 767, wrongWindow: 159, noSweepRate: 9.7 },
  { precinct: 81, total: 4802, noSweep: 459, wrongWindow: 99, noSweepRate: 9.6 },
  { precinct: 45, total: 1395, noSweep: 132, wrongWindow: 69, noSweepRate: 9.5 },
  { precinct: 63, total: 2049, noSweep: 194, wrongWindow: 30, noSweepRate: 9.5 },
  { precinct: 112, total: 7226, noSweep: 667, wrongWindow: 515, noSweepRate: 9.2 },
  { precinct: 83, total: 13890, noSweep: 1261, wrongWindow: 413, noSweepRate: 9.1 },
  { precinct: 69, total: 6459, noSweep: 564, wrongWindow: 117, noSweepRate: 8.7 },
  { precinct: 32, total: 3428, noSweep: 296, wrongWindow: 18, noSweepRate: 8.6 },
  { precinct: 114, total: 27730, noSweep: 2366, wrongWindow: 975, noSweepRate: 8.5 },
  { precinct: 107, total: 5823, noSweep: 487, wrongWindow: 241, noSweepRate: 8.4 },
  { precinct: 19, total: 38512, noSweep: 3173, wrongWindow: 907, noSweepRate: 8.2 },
  { precinct: 71, total: 7228, noSweep: 595, wrongWindow: 61, noSweepRate: 8.2 },
  { precinct: 18, total: 699, noSweep: 57, wrongWindow: 9, noSweepRate: 8.2 },
  { precinct: 75, total: 13114, noSweep: 1022, wrongWindow: 592, noSweepRate: 7.8 },
  { precinct: 79, total: 10330, noSweep: 803, wrongWindow: 243, noSweepRate: 7.8 },
  { precinct: 72, total: 10461, noSweep: 785, wrongWindow: 1224, noSweepRate: 7.5 },
  { precinct: 104, total: 10820, noSweep: 792, wrongWindow: 353, noSweepRate: 7.3 },
  { precinct: 5, total: 1486, noSweep: 105, wrongWindow: 165, noSweepRate: 7.1 },
  { precinct: 70, total: 10484, noSweep: 713, wrongWindow: 138, noSweepRate: 6.8 },
  { precinct: 108, total: 10828, noSweep: 739, wrongWindow: 348, noSweepRate: 6.8 },
  { precinct: 25, total: 3545, noSweep: 234, wrongWindow: 210, noSweepRate: 6.6 },
  { precinct: 23, total: 6786, noSweep: 425, wrongWindow: 221, noSweepRate: 6.3 },
  { precinct: 62, total: 13332, noSweep: 788, wrongWindow: 1130, noSweepRate: 5.9 },
  { precinct: 102, total: 4933, noSweep: 291, wrongWindow: 25, noSweepRate: 5.9 },
  { precinct: 68, total: 9061, noSweep: 517, wrongWindow: 408, noSweepRate: 5.7 },
  { precinct: 76, total: 7657, noSweep: 406, wrongWindow: 436, noSweepRate: 5.3 },
  { precinct: 66, total: 13461, noSweep: 670, wrongWindow: 377, noSweepRate: 5.0 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 15500,
  confirmedSweepTickets: 416224,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4)',
  methodology:
    'We cross-referenced 1M+ parking tickets against DSNY\u2019s own GPS records. A "no sweep" classification means zero GPS from any DSNY mechanical broom was associated with that street segment for the entire day. The GPS device is on the truck itself \u2014 if the truck drove down a block, it would register.',
  dataCleaning:
    'We excluded ~3,000 "junk drawer" segments (~15% of segments, ~41% of raw tickets) where the city\u2019s ticket-to-segment matching was broken \u2014 identified by house number ranges spanning entire avenues and tickets crossing 3+ police precincts. All numbers on this page use only verified single-block segments with tight address ranges.',
};
