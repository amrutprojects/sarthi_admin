/*
 * Training-operations data (live sessions, mode control, attendance, progress)
 * from the AS.db mock service, using the same rules as the original training.js.
 */
import AS from '../legacy';
import type { Candidate, Centre, District, Kpis, Mode } from '../types/domain';
import type { ChartItem } from '../types/legacy';

const db = () => AS.db;

export const liveSessions = () => db().liveSessions;
export const candidates = () => db().candidates;
export const byMode = (mode: Mode): Candidate[] => db().candidates.filter((c) => c.mode === mode);
export const kpis = (rows: Candidate[], target: number): Kpis => db().kpis(rows, target);
export const centres = () => db().centres;
export const centre = (id: string): Centre => db().centreBy[id];
export const batches = () => db().batches;
export const trainers = () => db().trainers;
export const trainerName = (id: string): string => db().trainerBy[id].name;
export const district = (id: string | null): District | null => (id ? db().districtBy[id] : null);
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const districts = () => db().districts;
export const byCentre = (id: string): Candidate[] => db().byCentre(id);
export const courseName = (id: string): string => db().courses.find((c) => c.id === id)?.name ?? '-';
export const config = () => db().config;
export const onlineUnit = () => db().onlineUnit;
export const lms = () => db().lms;
export const studentApp = () => db().studentApp;
export const attendanceTrend = () => db().attendanceTrend;
export const isEnrolled = (c: Candidate): boolean => db().inSet(db().ENROLLED_STATUSES, c.status);
export const isActive = (c: Candidate): boolean => db().inSet(db().ACTIVE_STATUSES, c.status);

export function topOnlineDistricts(): ChartItem[] {
  const g: Record<string, number> = {};
  byMode('ONLINE').forEach((c) => { g[c.districtId] = (g[c.districtId] || 0) + 1; });
  const arr = Object.keys(g).map((k) => ({ l: districtName(k), v: g[k], link: '#/districts/' + k })).sort((a, b) => b.v - a.v);
  const top: ChartItem[] = arr.slice(0, 6);
  const rest = arr.slice(6).reduce((a, x) => a + x.v, 0);
  if (rest) top.push({ l: 'Other districts', v: rest, c: '#DCC9B4' });
  return top;
}

export interface AttendanceFilter extends Record<string, string> { date: string; district: string; centre: string; batch: string; mode: string }
export const DEFAULT_ATT = (): AttendanceFilter => ({ date: db().config.asOf, district: 'ALL', centre: 'ALL', batch: 'ALL', mode: 'ALL' });
export function attendanceRows(f: AttendanceFilter): Candidate[] {
  return db().candidates.filter((c) =>
    isEnrolled(c)
    && (f.district === 'ALL' || c.districtId === f.district)
    && (f.centre === 'ALL' || c.centreId === f.centre)
    && (f.batch === 'ALL' || c.batchId === f.batch)
    && (f.mode === 'ALL' || c.mode === f.mode)
    && c.attendance > 0);
}

/* LMS sync lives in the LMS module (not yet converted). */
export const syncLms = () => AS.actions.syncLms && AS.actions.syncLms();
