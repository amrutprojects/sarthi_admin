import { WEEKDAY_CODES, WEEKDAY_SHORT, type Weekday } from '../types/calendar.types';

/*
 * Calendar dates are plain YYYY-MM-DD values (no time, no zone). Every helper works in UTC so a date
 * never shifts by a day in the browser's time zone.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/* Same rule as the backend's isoDate: the shape and a real calendar date (no 2026-02-30). */
export const isIsoDate = (v: string): boolean => ISO_RE.test(v) && !Number.isNaN(utc(v).getTime()) && utc(v).toISOString().startsWith(v);

export const addDays = (iso: string, n: number): string => new Date(utc(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);

/* MON … SUN. */
export const weekdayOf = (iso: string): Weekday => WEEKDAY_CODES[(utc(iso).getUTCDay() + 6) % 7];

/* "02 Jun 2026"; anything that is not a date is shown as it is. */
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  if (!isIsoDate(iso)) return iso;
  const d = utc(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/* "Tue, 02 Jun 2026". */
export const fmtDay = (iso: string): string => (isIsoDate(iso) ? `${WEEKDAY_SHORT[weekdayOf(iso)]}, ${fmtDate(iso)}` : iso);

/* Days from `from` to `to`, both included. */
export const daysInPeriod = (from: string, to: string): number => Math.round((utc(to).getTime() - utc(from).getTime()) / DAY_MS) + 1;

/* "Mon–Fri" for a run of consecutive days, otherwise "Mon, Wed, Fri". */
export function workingDaysLabel(days: readonly Weekday[]): string {
  const idx = WEEKDAY_CODES.map((d, i) => (days.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return 'None';
  if (idx.length === 7) return 'Every day';
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (consecutive && idx.length > 2) return `${WEEKDAY_SHORT[WEEKDAY_CODES[idx[0]]]}–${WEEKDAY_SHORT[WEEKDAY_CODES[idx[idx.length - 1]]]}`;
  return idx.map((i) => WEEKDAY_SHORT[WEEKDAY_CODES[i]]).join(', ');
}

export interface PeriodStats {
  /* Every day of the period. */
  days: number;
  /* Days that fall on a working weekday. */
  workingDays: number;
  /* Holidays that fall on a working weekday (the others change nothing). */
  holidaysOnWorkingDays: number;
  /* Working days minus those holidays: the days sessions can be scheduled on. */
  teachingDays: number;
}

/* Counts for the View page summary. Returns null for an invalid period. */
export function periodStats(from: string, to: string, workingDays: readonly Weekday[], holidayDates: readonly string[]): PeriodStats | null {
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return null;
  const days = daysInPeriod(from, to);
  const working = new Set(workingDays);
  /* Whole weeks contribute the same count; only the remainder needs a walk. */
  const weeks = Math.floor(days / 7);
  let count = weeks * working.size;
  for (let i = weeks * 7; i < days; i++) if (working.has(weekdayOf(addDays(from, i)))) count++;
  const holidaysOnWorkingDays = new Set(holidayDates.filter((d) => d >= from && d <= to && working.has(weekdayOf(d)))).size;
  return { days, workingDays: count, holidaysOnWorkingDays, teachingDays: count - holidaysOnWorkingDays };
}
