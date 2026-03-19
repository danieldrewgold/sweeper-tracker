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
  /** Physical ID + coordinates for "View on map" linking */
  location?: { pid: string; lat: number; lng: number; address: string };
}

export interface PrecinctRow {
  precinct: number;
  total: number;
  noSweep: number;
  noSweepRate: number;
}

export const HEADLINE_STATS: HeadlineStat[] = [
  {
    value: '79,618',
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
    value: '827,289',
    label: 'Tickets with confirmed sweeps',
    detail: 'Sweeper GPS proves the truck was there \u2014 the system works most of the time',
    color: 'green.500',
  },
  {
    value: '27,627',
    label: 'Verified block segments',
    detail: 'Segments with ticket data cross-referenced against sweeper GPS records',
    color: 'blue.500',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Rivington St (164\u2013178), Lower East Side \u2014 93% Skip Rate, 86 Tickets',
    borough: 'Manhattan',
    description:
      'This Rivington St block between 164 and 178 is scheduled for sweeping on Tuesdays, Thursdays, and Saturdays, but the sweeper almost never shows. Only 4 GPS visits in 10 months across 57 ASP-active days. All 86 tickets were issued on days the sweeper never came.',
    stats: [
      { label: 'Skip rate', value: '93.0%', color: 'red.500' },
      { label: 'Tickets issued', value: '86', color: 'red.500' },
      { label: 'GPS visits recorded', value: '4', color: 'blue.500' },
    ],
    highlight: 'Tue=96%, Thu=98%, Sat=98%. The sweeper comes roughly once every 2\u20133 months per day. 86 tickets at $65 = $5,590 in fines.',
    location: { pid: '16718', lat: 40.718964, lng: -73.984654, address: '164 Rivington St, Manhattan' },
  },
  {
    title: 'Queens Blvd (116-001\u2013117-099), Rego Park \u2014 97% Skip Rate',
    borough: 'Queens',
    description:
      'This Queens Blvd segment near 116th St has 6 scheduled sweep days but GPS shows the sweeper almost never arrives. Skipped on virtually every scheduled day across the entire analysis period.',
    stats: [
      { label: 'Skip rate', value: '96.9%', color: 'red.500' },
      { label: 'Tickets issued', value: '0', color: 'blue.500' },
      { label: 'GPS visits recorded', value: '~2', color: 'blue.500' },
    ],
    highlight: 'Mon=96%, Tue=96%, Wed=96%, Thu=96%, Fri=98%, Sat=98%. Every day of the week skipped 96\u201398% of the time. No tickets issued despite being an active ASP zone.',
    location: { pid: '12411', lat: 40.715775, lng: -73.832724, address: '116-01 Queens Blvd, Queens' },
  },
  {
    title: 'Myrtle Ave (488\u2013524), Brooklyn \u2014 86% Skip Rate, 185 Tickets',
    borough: 'Brooklyn',
    description:
      'This Myrtle Ave block between 488 and 524 has 6 scheduled sweep days, all nearly phantom. The sweeper came only 10 times across 73 ASP-active days. Despite the near-total absence of sweeping, 185 tickets were issued \u2014 every single one on a day the sweeper never showed.',
    stats: [
      { label: 'Skip rate', value: '86.3%', color: 'red.500' },
      { label: 'Tickets issued', value: '185', color: 'red.500' },
      { label: 'GPS visits recorded', value: '10', color: 'blue.500' },
    ],
    highlight: 'Mon=98%, Tue=96%, Wed=96%, Thu=98%, Fri=96%, Sat=96%. All 6 sweep days skipped 96\u201398% of the time. 185 tickets at $65 = $12,025.',
    location: { pid: '204646', lat: 40.693484, lng: -73.965038, address: '488 Myrtle Ave, Brooklyn' },
  },
  {
    title: 'Ocean Pkwy (2001\u20132099), Brooklyn \u2014 90% Skip Rate, 48 Tickets',
    borough: 'Brooklyn',
    description:
      'This Ocean Parkway block between 2001 and 2099 is scheduled for Friday sweeps but the sweeper skips 96% of the time. All 48 tickets were issued on days the sweeper never came.',
    stats: [
      { label: 'Skip rate', value: '89.5%', color: 'red.500' },
      { label: 'Tickets issued', value: '48', color: 'red.500' },
      { label: 'GPS visits recorded', value: '2', color: 'blue.500' },
    ],
    highlight: 'Fri=96%. The sweeper came only twice in 10 months on this block. 48 tickets at $65 = $3,120 in fines.',
    location: { pid: '38814', lat: 40.598967, lng: -73.965696, address: '2001 Ocean Pkwy, Brooklyn' },
  },
  {
    title: 'Dreiser Loop (141\u2013143), Bronx \u2014 76% Skip Rate, Co-op City',
    borough: 'Bronx',
    description:
      'This Dreiser Loop block at 141\u2013143 in Co-op City is scheduled for Thursday sweeps but the sweeper skips 91% of the time. Only 5 GPS visits over 21 ASP-active days. 28 tickets issued, all on days the sweeper never showed up.',
    stats: [
      { label: 'Skip rate', value: '76.2%', color: 'red.500' },
      { label: 'Tickets issued', value: '28', color: 'red.500' },
      { label: 'GPS visits recorded', value: '5', color: 'blue.500' },
    ],
    highlight: 'Thu=91%. The sweeper comes roughly once every 2 months on Thursdays. Yet tickets are written consistently. 28 tickets at $65 = $1,820 in fines.',
    location: { pid: '121711', lat: 40.876194, lng: -73.830031, address: '141 Dreiser Loop, Bronx' },
  },
];

export const PRECINCT_DATA: PrecinctRow[] = [
  { precinct: 87, total: 50, noSweep: 17, noSweepRate: 34.0 },
  { precinct: 100, total: 65, noSweep: 15, noSweepRate: 23.1 },
  { precinct: 33, total: 4519, noSweep: 806, noSweepRate: 17.8 },
  { precinct: 40, total: 8946, noSweep: 1388, noSweepRate: 15.5 },
  { precinct: 28, total: 6083, noSweep: 939, noSweepRate: 15.4 },
  { precinct: 24, total: 15955, noSweep: 2342, noSweepRate: 14.7 },
  { precinct: 41, total: 3359, noSweep: 474, noSweepRate: 14.1 },
  { precinct: 42, total: 3052, noSweep: 426, noSweepRate: 14.0 },
  { precinct: 78, total: 18832, noSweep: 2536, noSweepRate: 13.5 },
  { precinct: 6, total: 15770, noSweep: 2005, noSweepRate: 12.7 },
  { precinct: 77, total: 11586, noSweep: 1451, noSweepRate: 12.5 },
  { precinct: 7, total: 3669, noSweep: 449, noSweepRate: 12.2 },
  { precinct: 26, total: 5045, noSweep: 580, noSweepRate: 11.5 },
  { precinct: 52, total: 9775, noSweep: 1117, noSweepRate: 11.4 },
  { precinct: 94, total: 23282, noSweep: 2489, noSweepRate: 10.7 },
  { precinct: 13, total: 4937, noSweep: 521, noSweepRate: 10.6 },
  { precinct: 101, total: 392, noSweep: 41, noSweepRate: 10.5 },
  { precinct: 14, total: 1957, noSweep: 202, noSweepRate: 10.3 },
  { precinct: 84, total: 7019, noSweep: 726, noSweepRate: 10.3 },
  { precinct: 20, total: 14479, noSweep: 1474, noSweepRate: 10.2 },
  { precinct: 1, total: 6323, noSweep: 630, noSweepRate: 10.0 },
  { precinct: 48, total: 5634, noSweep: 558, noSweepRate: 9.9 },
  { precinct: 63, total: 2078, noSweep: 205, noSweepRate: 9.9 },
  { precinct: 67, total: 8969, noSweep: 867, noSweepRate: 9.7 },
  { precinct: 109, total: 4906, noSweep: 472, noSweepRate: 9.6 },
  { precinct: 73, total: 8108, noSweep: 754, noSweepRate: 9.3 },
  { precinct: 103, total: 4168, noSweep: 385, noSweepRate: 9.2 },
  { precinct: 60, total: 5302, noSweep: 472, noSweepRate: 8.9 },
  { precinct: 49, total: 5908, noSweep: 518, noSweepRate: 8.8 },
  { precinct: 32, total: 4401, noSweep: 382, noSweepRate: 8.7 },
  { precinct: 90, total: 21678, noSweep: 1869, noSweepRate: 8.6 },
  { precinct: 30, total: 3177, noSweep: 270, noSweepRate: 8.5 },
  { precinct: 81, total: 7671, noSweep: 641, noSweepRate: 8.4 },
  { precinct: 19, total: 41720, noSweep: 3474, noSweepRate: 8.3 },
  { precinct: 10, total: 6129, noSweep: 505, noSweepRate: 8.2 },
  { precinct: 113, total: 305, noSweep: 25, noSweepRate: 8.2 },
  { precinct: 5, total: 3267, noSweep: 263, noSweepRate: 8.1 },
  { precinct: 83, total: 15240, noSweep: 1221, noSweepRate: 8.0 },
  { precinct: 102, total: 3705, noSweep: 297, noSweepRate: 8.0 },
  { precinct: 71, total: 7928, noSweep: 619, noSweepRate: 7.8 },
  { precinct: 34, total: 5930, noSweep: 457, noSweepRate: 7.7 },
  { precinct: 61, total: 8399, noSweep: 644, noSweepRate: 7.7 },
  { precinct: 88, total: 12913, noSweep: 975, noSweepRate: 7.6 },
  { precinct: 115, total: 6721, noSweep: 511, noSweepRate: 7.6 },
  { precinct: 104, total: 13029, noSweep: 972, noSweepRate: 7.5 },
  { precinct: 79, total: 17199, noSweep: 1280, noSweepRate: 7.4 },
  { precinct: 47, total: 6141, noSweep: 445, noSweepRate: 7.2 },
  { precinct: 45, total: 2824, noSweep: 197, noSweepRate: 7.0 },
  { precinct: 46, total: 6360, noSweep: 437, noSweepRate: 6.9 },
  { precinct: 114, total: 16557, noSweep: 1128, noSweepRate: 6.8 },
  { precinct: 23, total: 9453, noSweep: 631, noSweepRate: 6.7 },
  { precinct: 50, total: 2803, noSweep: 189, noSweepRate: 6.7 },
  { precinct: 43, total: 9520, noSweep: 633, noSweepRate: 6.6 },
  { precinct: 44, total: 4959, noSweep: 329, noSweepRate: 6.6 },
  { precinct: 69, total: 6673, noSweep: 442, noSweepRate: 6.6 },
  { precinct: 72, total: 10404, noSweep: 687, noSweepRate: 6.6 },
  { precinct: 9, total: 6371, noSweep: 412, noSweepRate: 6.5 },
  { precinct: 107, total: 2329, noSweep: 151, noSweepRate: 6.5 },
  { precinct: 106, total: 16, noSweep: 1, noSweepRate: 6.2 },
  { precinct: 110, total: 4302, noSweep: 256, noSweepRate: 6.0 },
  { precinct: 70, total: 14265, noSweep: 832, noSweepRate: 5.8 },
  { precinct: 75, total: 11879, noSweep: 682, noSweepRate: 5.7 },
  { precinct: 62, total: 13775, noSweep: 749, noSweepRate: 5.4 },
  { precinct: 112, total: 4882, noSweep: 262, noSweepRate: 5.4 },
  { precinct: 108, total: 4400, noSweep: 223, noSweepRate: 5.1 },
  { precinct: 17, total: 1210, noSweep: 56, noSweepRate: 4.6 },
  { precinct: 66, total: 13589, noSweep: 605, noSweepRate: 4.5 },
  { precinct: 18, total: 1830, noSweep: 80, noSweepRate: 4.4 },
  { precinct: 25, total: 4213, noSweep: 183, noSweepRate: 4.3 },
  { precinct: 68, total: 9294, noSweep: 381, noSweepRate: 4.1 },
  { precinct: 76, total: 8514, noSweep: 265, noSweepRate: 3.1 },
  { precinct: 105, total: 100, noSweep: 2, noSweepRate: 2.0 },
  { precinct: 116, total: 76, noSweep: 1, noSweepRate: 1.3 },
];

export const META = {
  dataRange: 'June 2025 \u2013 March 2026',
  totalSegments: 27627,
  confirmedSweepTickets: 827289,
  source: 'NYC Open Data (DSNY Mechanical Broom GPS dataset c23c-uwsm, DOF Parking Violations dataset pvqr-7yc4, CSCL Centerline inkn-q76z)',
  methodology:
    'We cross-referenced 1.06M parking tickets against DSNY\u2019s own GPS records across 27,627 street segments. A ticket is classified as "no sweep" only if it falls on a day-of-week where GPS has historically confirmed the sweeper visits that specific side of the street, but the sweeper didn\u2019t show up that particular date. Address matching uses a single unified pipeline with Queens-aware hyphenated house numbers, geocoded letter-prefix tickets, and a 20-house-number proximity cap. Day-of-week analysis uses 319 days of Mon\u2013Sat data.',
  dataCleaning:
    'Each CSCL segment represents one side of one block. ASP signs from the NYC DOT database can include rules for both curbs, so we use GPS data to determine which days the sweeper actually services each side. Per-block skip rates use only days-of-week where GPS has detected the sweeper at least once. Tickets on non-GPS-active days are excluded from no-sweep counts since they likely reflect the opposite curb\u2019s schedule. Some CSCL segments overlap geographically (e.g. service roads on wide boulevards), which can cause GPS to register on different physical IDs over time \u2014 segments with zero confirmed sweep-day tickets are excluded from worst-block rankings.',
};
