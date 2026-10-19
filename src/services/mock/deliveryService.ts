/*
 * Batches and trainers data from the AS.db mock service,
 * using the same rules as the original batches.js.
 */
import AS from '../../legacy';
import type { Batch, Candidate, CandidateStatus, Centre, Course, District, LiveSession, Tone, Trainer } from '../../types/domain';

const db = () => AS.db;

export const batches = () => db().batches;
export const batch = (id: string): Batch | undefined => db().batchBy[id];
export const byBatch = (id: string): Candidate[] => db().byBatch(id);
export const trainers = () => db().trainers;
export const trainer = (id: string): Trainer => db().trainerBy[id];
export const centre = (id: string): Centre => db().centreBy[id];
export const allCentres = () => db().allCentres;
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const district = (id: string | null): District | null => (id ? db().districtBy[id] : null);
export const courses = () => db().courses;
export const course = (id: string): Course | undefined => db().courses.find((x) => x.id === id);
export const courseName = (id: string): string => {
  const c = course(id);
  return c ? c.name : '—';
};
export const config = () => db().config;
export const liveSessionFor = (batchId: string): LiveSession | undefined => db().liveSessions.find((s) => s.batchId === batchId);
export const addDays = (iso: string, n: number): string => db().addDays(iso, n);
export const daysBetween = (a: string, b: string): number => db().daysBetween(a, b);
export const inSet = (set: CandidateStatus[], s: CandidateStatus): boolean => db().inSet(set, s);
export const SETS = () => ({ ASSESSED: db().ASSESSED_STATUSES, PASSED: db().PASSED_STATUSES, COMPLETED: db().COMPLETED_STATUSES });

export interface BatchFilter extends Record<string, string> {
  district: string;
  centre: string;
  mode: string;
  status: string;
  course: string;
}
export const DEFAULT_BATCH: BatchFilter = { district: 'ALL', centre: 'ALL', mode: 'ALL', status: 'ALL', course: 'ALL' };
export function filterBatches(f: BatchFilter): Batch[] {
  return db().batches.filter(
    (b) =>
      (f.district === 'ALL' || b.districtId === f.district) &&
      (f.centre === 'ALL' || b.centreId === f.centre) &&
      (f.mode === 'ALL' || b.mode === f.mode) &&
      (f.status === 'ALL' || b.status === f.status) &&
      (f.course === 'ALL' || b.courseId === f.course),
  );
}

export interface TrainerFilter extends Record<string, string> {
  district: string;
  mode: string;
  availability: string;
  tot: string;
}
export const DEFAULT_TRAINER: TrainerFilter = { district: 'ALL', mode: 'ALL', availability: 'ALL', tot: 'ALL' };
export function filterTrainers(f: TrainerFilter): Trainer[] {
  return db().trainers.filter(
    (t) =>
      (f.district === 'ALL' || t.districtId === f.district) &&
      (f.mode === 'ALL' || t.mode === f.mode) &&
      (f.availability === 'ALL' || t.availability === f.availability) &&
      (f.tot === 'ALL' || t.totStatus === f.tot),
  );
}

export const totTone = (s: string): Tone => (s === 'CERTIFIED' ? 'green' : s === 'COMPLETED' ? 'blue' : 'amber');
