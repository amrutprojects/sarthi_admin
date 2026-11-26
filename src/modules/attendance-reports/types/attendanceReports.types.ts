/* M3 attendance reports: shapes of sarthi-api GET /attendance-reports and /attendance-reports/status. */
export type ReportLevel = 'division' | 'district' | 'centre' | 'batch';

export interface Place {
  code: string;
  name: string;
  nameMr: string | null;
}

export interface ReportCounts {
  batches: number;
  sessionsHeld: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /* present + late + absent + excused: what the percentages are taken over. */
  marked: number;
  selfCheckIns: number;
  geoCheckIns: number;
  selfies: number;
  groupPhotos: number;
  presentPercent: number | null;
  latePercent: number | null;
  absentPercent: number | null;
  excusedPercent: number | null;
  attendancePercent: number | null;
}

export interface ReportRow extends ReportCounts {
  code: string;
  name: string;
  nameMr: string | null;
  /* false: the LMS code is not in Sarthi's masters (shown under the code). */
  mapped: boolean;
  division: Place | null;
  district: Place | null;
  centre: Place | null;
}

export interface AttendanceReport {
  level: ReportLevel;
  dateFrom: string | null;
  dateTo: string | null;
  fetchedAt: string;
  filters: { division: Place | null; district: Place | null; centre: Place | null };
  rows: ReportRow[];
  totals: ReportCounts;
  /* LMS rows the drill-down filter could not place (unknown to Sarthi's masters); not in rows or totals. */
  unplaced: number;
}

export interface AttendanceReportsStatus {
  /* Server master switch LMS_READS_ENABLED. */
  enabled: boolean;
  configured: boolean;
  /* G-2 setting "Show live LMS data" (System Settings). */
  liveData: boolean;
  /* enabled && liveData && configured: reports can be read now. */
  live: boolean;
  cacheSeconds: number;
  timeoutMs: number;
}

export interface AttendanceReportQuery {
  level: ReportLevel;
  dateFrom?: string;
  dateTo?: string;
  division?: string;
  district?: string;
  centre?: string;
}
