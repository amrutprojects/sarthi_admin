/*
 * Candidate data access and selectors (same rules as the original candidates.js),
 * all reading the AS.db mock service. Replace with REST calls when a backend exists.
 */
import AS from '../../legacy';
import type { Batch, Candidate, CandidateStatus, Centre, Course, District, DistrictStatusDef, Kpis, StatusDef } from '../../types/domain';
import type { Option } from '../../types/legacy';

const db = () => AS.db;

export const DEFAULT_CAND_FILTER: CandidateFilter = {
  district: 'ALL',
  taluka: 'ALL',
  mode: 'ALL',
  centre: 'ALL',
  batch: 'ALL',
  status: 'ALL',
  gender: 'ALL',
  bucket: 'ALL',
};

export interface CandidateFilter extends Record<string, string> {
  district: string;
  taluka: string;
  mode: string;
  centre: string;
  batch: string;
  status: string;
  gender: string;
  bucket: string;
}

export const BUCKETS: Record<string, { l: string; f: (c: Candidate) => boolean }> = {
  ALL: { l: 'All records', f: () => true },
  applications: { l: 'All applications', f: () => true },
  eligible: { l: 'Eligible', f: (c) => c.status !== 'NOT_ELIGIBLE' },
  noteligible: { l: 'Not eligible', f: (c) => c.status === 'NOT_ELIGIBLE' },
  verification: { l: 'Under verification', f: (c) => c.status === 'UNDER_VERIFICATION' },
  docs: { l: 'Documents pending', f: (c) => c.status === 'DOCUMENTS_PENDING' },
  enrolled: { l: 'Enrolled', f: (c) => db().inSet(db().ENROLLED_STATUSES, c.status) },
  active: { l: 'Training active', f: (c) => db().inSet(db().ACTIVE_STATUSES, c.status) },
  completed: { l: 'Training completed', f: (c) => db().inSet(db().COMPLETED_STATUSES, c.status) },
  assessed: { l: 'Assessed', f: (c) => db().inSet(db().ASSESSED_STATUSES, c.status) },
  passed: { l: 'Passed', f: (c) => db().inSet(db().PASSED_STATUSES, c.status) },
  failed: { l: 'Failed', f: (c) => c.status === 'FAILED' },
  certified: { l: 'Certified', f: (c) => db().inSet(db().CERTIFIED_STATUSES, c.status) },
  risk: { l: 'At risk', f: (c) => c.risks.length > 0 },
  lowatt: { l: 'Attendance below 75%', f: (c) => c.attendance > 0 && c.attendance < 75 },
};

export function filterCandidates(f: CandidateFilter): Candidate[] {
  const bucket = BUCKETS[f.bucket] || BUCKETS.ALL;
  return db().candidates.filter(
    (c) =>
      bucket.f(c) &&
      (f.district === 'ALL' || c.districtId === f.district) &&
      (f.taluka === 'ALL' || c.taluka === f.taluka) &&
      (f.mode === 'ALL' || c.mode === f.mode) &&
      (f.centre === 'ALL' || c.centreId === f.centre) &&
      (f.batch === 'ALL' || c.batchId === f.batch) &&
      (f.status === 'ALL' || c.status === f.status) &&
      (f.gender === 'ALL' || c.gender === f.gender),
  );
}

export function candidateKpis(rows: Candidate[], f: CandidateFilter): Kpis {
  return db().kpis(rows, f.district !== 'ALL' ? db().districtBy[f.district].target : db().config.target);
}

export const talukaOptions = (districtId: string): Option[] =>
  ([{ v: 'ALL', l: 'All talukas' }] as Option[]).concat(
    (districtId !== 'ALL' ? db().districtBy[districtId].talukas : []).map((t) => ({ v: t, l: t })),
  );
export const centreOptions = () => AS.ui.centreOptions();
export const batchOptions = () => AS.ui.batchOptions();
export const statusOptions = () => AS.ui.statusOptions();

export const getCandidate = (id: string): Candidate | undefined => db().candidateBy[id];
export const district = (id: string): District => db().districtBy[id];
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const centre = (id: string | null): Centre | null => (id ? db().centreBy[id] : null);
export const batch = (id: string | null): Batch | null => (id ? db().batchBy[id] : null);
export const trainerName = (id: string): string => db().trainerBy[id].name;
export const course = (id: string | null): Course | undefined => db().courses.find((x) => x.id === id);
export const statusDef = (k: CandidateStatus): StatusDef => db().STATUS_MAP[k];
export const statuses = () => db().STATUS;
export const config = () => db().config;
export const districts = () => db().districts;
export const communications = () => db().communications;
export const addDays = (iso: string, n: number): string => db().addDays(iso, n);
export const atRiskCandidates = () => db().atRiskCandidates();
export const mobilization = () => db().mobilization;
export const stateKpis = () => db().stateKpis;
export const candidates = () => db().candidates;
export const centres = () => db().centres;
export const districtStatus = (d: District): DistrictStatusDef => db().DISTRICT_STATUS[d.status];
export const districtKpis = (d: District): Kpis => db().kpis(db().byDistrict(d.code), d.target);

/* Session-only status change, as in the original prototype. */
export function updateStatus(id: string, status: CandidateStatus): Candidate | undefined {
  const c = db().candidateBy[id];
  if (c) c.status = status;
  return c;
}

export { learnerPanelHtml } from '../../utils/learnerPanel';
