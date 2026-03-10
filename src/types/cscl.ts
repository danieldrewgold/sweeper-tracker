export interface CsclSegment {
  physicalid: string;
  full_street_name: string;
  stname_label: string;
  street_name: string;
  l_low_hn: string;
  l_high_hn: string;
  r_low_hn: string;
  r_high_hn: string;
  boroughcode: string;
  l_zip: string;
  r_zip: string;
  trafdir: string;
  streetwidth: string;
  segmentlength: string;
  the_geom: {
    type: 'MultiLineString';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
}

export interface SegmentDisplayState {
  physicalId: string;
  status: import('./sweep').SweepStatus;
  lastSweptTime: Date | null;
  segment: CsclSegment;
}
