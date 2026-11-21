import type { AttendanceReport, Place, ReportCounts, ReportRow } from '../types/attendanceReports.types';

/* Synthetic M3 report answers (no real learners, centres or figures). */
export const counts = (present: number, late: number, absent: number, excused = 0, over: Partial<ReportCounts> = {}): ReportCounts => {
  const marked = present + late + absent + excused;
  const p = (n: number) => (marked ? Math.round((n * 1000) / marked) / 10 : null);
  return {
    batches: 1,
    sessionsHeld: 4,
    present,
    late,
    absent,
    excused,
    marked,
    selfCheckIns: 6,
    geoCheckIns: 5,
    selfies: 4,
    groupPhotos: 2,
    presentPercent: p(present),
    latePercent: p(late),
    absentPercent: p(absent),
    excusedPercent: p(excused),
    attendancePercent: p(present + late),
    ...over,
  };
};

export const place = (code: string, name: string, nameMr: string | null = null): Place => ({ code, name, nameMr });

export const row = (p: Place, c: ReportCounts, over: Partial<ReportRow> = {}): ReportRow => ({
  ...p,
  ...c,
  mapped: true,
  division: null,
  district: null,
  centre: null,
  ...over,
});

export function report(over: Partial<AttendanceReport> = {}): AttendanceReport {
  const rows = over.rows ?? [
    row(place('NAGPUR', 'Nagpur', 'नागपूर'), counts(9, 0, 1)),
    row(place('PUNE', 'Pune', 'पुणे'), counts(70, 10, 20)),
  ];
  return {
    level: 'division',
    dateFrom: '2026-10-23',
    dateTo: '2026-11-21',
    fetchedAt: '2026-11-21T07:00:00.000Z',
    filters: { division: null, district: null, centre: null },
    rows,
    totals: counts(79, 10, 21, 0, { batches: 2, sessionsHeld: 8, selfCheckIns: 12, geoCheckIns: 10, selfies: 8, groupPhotos: 4 }),
    unplaced: 0,
    ...over,
  };
}
