export interface AspSign {
  sign_description: string;
  on_street: string;
  from_street: string;
  to_street: string;
  side_of_street: string;
  borough: string;
  sign_x_coord: string;
  sign_y_coord: string;
  arrow_direction?: string;
  sign_code: string;
}

export interface ParsedSchedule {
  day: string; // "MONDAY", "TUESDAY", etc.
  startTime: string; // "8:30AM"
  endTime: string; // "10AM"
  startMinutes: number; // minutes since midnight
  endMinutes: number;
  side: string; // "N", "S", "E", "W"
  rawDescription: string;
}
