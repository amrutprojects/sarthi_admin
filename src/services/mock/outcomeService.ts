/*
 * Assessment, certification and outreach data from the AS.db mock service,
 * using the same rules as the original assessment.js / outreach.js.
 */
import AS from '../../legacy';
import type { Campaign, Candidate, CandidateStatus } from '../../types/domain';
import type { ChartItem } from '../../types/legacy';

const db = () => AS.db;
const inSet = (set: CandidateStatus[], s: CandidateStatus): boolean => db().inSet(set, s);

export const candidates = () => db().candidates;
export const config = () => db().config;
export const districts = () => db().districts;
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const centreName = (id: string | null): string => (id ? db().centreBy[id].name : '—');
export const courseName = (id: string | null): string => db().courses.find((c) => c.id === id)?.name ?? '—';
export const batches = () => db().batches;
export const allCentres = () => db().allCentres;
export const stateKpis = () => db().stateKpis;
export const mobilization = () => db().mobilization;
export const campaigns = () => db().campaigns;
export const campaign = (id: string): Campaign | undefined => db().campaigns.find((c) => c.id === id);
export const leadSources = () => db().leadSources;
export const communications = () => db().communications;
export const palette = () => AS.charts.palette;

export const isCompleted = (c: Candidate): boolean => inSet(db().COMPLETED_STATUSES, c.status);
export const isAssessed = (c: Candidate): boolean => inSet(db().ASSESSED_STATUSES, c.status);
export const isPassed = (c: Candidate): boolean => inSet(db().PASSED_STATUSES, c.status);

/* ---------- assessments ---------- */
export interface AssessFilter extends Record<string, string> {
  district: string;
  centre: string;
  mode: string;
  batch: string;
}
export const DEFAULT_ASSESS: AssessFilter = { district: 'ALL', centre: 'ALL', mode: 'ALL', batch: 'ALL' };
export function assessRows(f: AssessFilter): Candidate[] {
  return db().candidates.filter(
    (c) =>
      isCompleted(c) &&
      (f.district === 'ALL' || c.districtId === f.district) &&
      (f.centre === 'ALL' || c.centreId === f.centre) &&
      (f.mode === 'ALL' || c.mode === f.mode) &&
      (f.batch === 'ALL' || c.batchId === f.batch),
  );
}
export function avgScore(list: Candidate[]): number {
  const s = list.filter((c) => c.score != null);
  return s.length ? Math.round(s.reduce((a, c) => a + (c.score ?? 0), 0) / s.length) : 0;
}
export function passRateBy(key: 'districtId' | 'centreId' | 'courseId'): ChartItem[] {
  const g: Record<string, { t: number; p: number }> = {};
  db()
    .candidates.filter(isAssessed)
    .forEach((c) => {
      const k = c[key];
      if (!k) return;
      g[k] = g[k] || { t: 0, p: 0 };
      g[k].t++;
      if (isPassed(c)) g[k].p++;
    });
  return Object.keys(g)
    .map((k) => {
      const label =
        key === 'districtId'
          ? districtName(k)
          : key === 'centreId'
            ? db().centreBy[k].name.split(' ').slice(0, 2).join(' ')
            : (db().courses.find((x) => x.id === k)?.name ?? k);
      const v = Math.round((g[k].p / g[k].t) * 100);
      return { l: label, v, display: v + '% (' + g[k].p + '/' + g[k].t + ')', c: v >= 85 ? '#1E7A46' : v >= 70 ? '#C8651C' : '#B3271E' };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);
}

/* ---------- certification ---------- */
export interface CertFilter extends Record<string, string> {
  district: string;
  centre: string;
  mode: string;
  state: string;
}
export const DEFAULT_CERT: CertFilter = { district: 'ALL', centre: 'ALL', mode: 'ALL', state: 'ALL' };
export function certRows(f: CertFilter): Candidate[] {
  return db().candidates.filter(
    (c) =>
      isPassed(c) &&
      (f.district === 'ALL' || c.districtId === f.district) &&
      (f.centre === 'ALL' || c.centreId === f.centre) &&
      (f.mode === 'ALL' || c.mode === f.mode) &&
      !(f.state === 'generated' && c.status !== 'CERTIFICATE_GENERATED') &&
      !(f.state === 'issued' && c.status !== 'CERTIFIED'),
  );
}
export function certByDistrict(): ChartItem[] {
  const g: Record<string, number> = {};
  db()
    .candidates.filter(isPassed)
    .forEach((c) => {
      g[c.districtId] = (g[c.districtId] || 0) + 1;
    });
  return Object.keys(g)
    .map((k) => ({ l: db().districtBy[k] ? db().districtBy[k].name : k, v: g[k], link: '#/certification?district=' + k, c: '#E88C2C' }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);
}
/* Session-only issue of generated certificates, as in the original prototype. */
export function issueGenerated() {
  const pending = db().candidates.filter((c) => c.status === 'CERTIFICATE_GENERATED');
  pending.forEach((c) => {
    c.status = 'CERTIFIED';
  });
  return pending.length;
}
