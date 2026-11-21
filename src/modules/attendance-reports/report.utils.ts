import { ApiError } from '../../services/api-client';
import { LABELS, placeName, type Lang } from './labels';
import type { AttendanceReport, Place, ReportCounts, ReportLevel } from './types/attendanceReports.types';

/* Pure helpers of the Attendance reports screen (unit-tested in tests/report.utils.test.ts). */

/* Where the user has drilled to: division → district → centre (→ batches of that centre). */
export interface DrillPath {
  division?: Place;
  district?: Place;
  centre?: Place;
}

export const levelFor = (p: DrillPath): ReportLevel => (p.centre ? 'batch' : p.district ? 'centre' : p.division ? 'district' : 'division');

export const MAX_RANGE_DAYS = 366;

/* True when both dates are set and the range is reversed or longer than the LMS accepts. */
export function rangeInvalid(from: string, to: string): boolean {
  if (!from || !to) return false;
  if (from > to) return true;
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  return days > MAX_RANGE_DAYS;
}

/* Why there are no figures, from the API's error code. */
export type Unavailable = 'off' | 'notConfigured' | 'down' | 'noAccess' | 'badRange' | 'error';

const OFF_CODES = new Set(['LMS_READS_DISABLED', 'LMS_LIVE_DATA_OFF']);
const DOWN_CODES = new Set([
  'LMS_TIMEOUT',
  'LMS_UNREACHABLE',
  'LMS_UNAVAILABLE',
  'LMS_RATE_LIMITED',
  'LMS_KEY_REJECTED',
  'LMS_BAD_ANSWER',
  'LMS_ERROR',
  'LMS_NOT_FOUND',
  'NETWORK_ERROR',
]);

export function unavailableFrom(err: unknown): Unavailable {
  if (!(err instanceof ApiError)) return 'error';
  if (OFF_CODES.has(err.code)) return 'off';
  if (err.code === 'LMS_NOT_CONFIGURED' || err.code === 'LMS_LIVE_DATA_UNAVAILABLE') return 'notConfigured';
  if (err.status === 403) return 'noAccess';
  if (err.status === 422 || err.code === 'LMS_QUERY_REJECTED') return 'badRange';
  if (DOWN_CODES.has(err.code) || err.status === 503) return 'down';
  return 'error';
}

export const pctText = (v: number | null): string => (v == null ? '—' : `${v.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`);

/* One CSV cell: quoted when needed; a leading = + - @ is neutralised so a spreadsheet never runs it as a formula. */
export function csvCell(v: string | number | null): string {
  if (v == null) return '';
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COUNT_COLUMNS = (lang: Lang): [string, (c: ReportCounts) => number | null][] => {
  const t = LABELS[lang];
  return [
    [t.batches, (c) => c.batches],
    [t.sessionsHeld, (c) => c.sessionsHeld],
    [t.marked, (c) => c.marked],
    [t.present, (c) => c.present],
    [t.late, (c) => c.late],
    [t.absent, (c) => c.absent],
    [t.excused, (c) => c.excused],
    [t.presentPct, (c) => c.presentPercent],
    [t.latePct, (c) => c.latePercent],
    [t.absentPct, (c) => c.absentPercent],
    [t.attendancePct, (c) => c.attendancePercent],
    [t.selfCheckIns, (c) => c.selfCheckIns],
    [t.geoCheckIns, (c) => c.geoCheckIns],
    [t.selfies, (c) => c.selfies],
    [t.groupPhotos, (c) => c.groupPhotos],
  ];
};

/* Exactly the table on screen (same rows, totals and language), with the area and range on top. UTF-8 with BOM for Excel. */
export function reportCsv(report: AttendanceReport, path: DrillPath, lang: Lang): string {
  const t = LABELS[lang];
  const cols = COUNT_COLUMNS(lang);
  const area = [path.division, path.district, path.centre].filter((p): p is Place => !!p).map((p) => placeName(p, lang));
  const lines: (string | number | null)[][] = [
    [t.title],
    [area.length ? area.join(' / ') : t.allDivisions],
    [report.dateFrom && report.dateTo ? t.range(report.dateFrom, report.dateTo) : ''],
    [t.asOf, report.fetchedAt],
    [],
    [t[report.level], t.code, ...cols.map(([l]) => l)],
    ...report.rows.map((r) => [placeName(r, lang), r.code, ...cols.map(([, f]) => f(r))]),
    [t.total, '', ...cols.map(([, f]) => f(report.totals))],
  ];
  return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function csvFileName(report: AttendanceReport, path: DrillPath): string {
  const area = [path.division, path.district, path.centre].filter((p): p is Place => !!p).map((p) => p.code);
  const parts = ['attendance', report.level, ...area, report.dateFrom ?? '', report.dateTo ?? ''].filter(Boolean);
  return `${parts.join('_').replace(/[^A-Za-z0-9_.-]+/g, '-')}.csv`;
}

export function downloadText(fileName: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
