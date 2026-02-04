export interface NavPvtData {
  iTOW: number; // GPS time of week of the navigation epoch (ms)
  year: number;
  month: number;
  day: number;
  hour: number;
  min: number;
  sec: number;
  valid: number; // Validity flags
  tAcc: number; // Time accuracy estimate (ns)
  nano: number; // Fraction of second (ns)
  fixType: number; // GNSSfix Type: 0: no fix, 1: dead reckoning only, 2: 2D-fix, 3: 3D-fix
  flags: number; // Fix status flags
  numSV: number; // Number of satellites used in Nav Solution
  lon: number; // Longitude (deg)
  lat: number; // Latitude (deg)
  height: number; // Height above ellipsoid (mm)
  hMSL: number; // Height above mean sea level (mm)
  hAcc: number; // Horizontal accuracy estimate (mm)
  vAcc: number; // Vertical accuracy estimate (mm)
  velN: number; // NED north velocity (mm/s)
  velE: number; // NED east velocity (mm/s)
  velD: number; // NED down velocity (mm/s)
  gSpeed: number; // Ground Speed (2-D) (mm/s)
  headMot: number; // Heading of motion (2-D) (deg)
  sAcc: number; // Speed accuracy estimate (mm/s)
  headAcc: number; // Heading accuracy estimate (deg)
  pDOP: number; // Position DOP
  timestamp: string; // Formatting timestamp for display
  rawHex: string; // The original hex string for reference
}

export enum FixType {
  NO_FIX = 0,
  DEAD_RECKONING = 1,
  FIX_2D = 2,
  FIX_3D = 3,
  GNSS_AND_DR = 4,
  TIME_ONLY = 5
}

export interface ParseResult {
  success: boolean;
  data?: NavPvtData;
  error?: string;
}