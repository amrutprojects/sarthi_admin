/*
 * Delivery-network data (districts, talukas, centres) from the AS.db mock service,
 * using the same rules as the original geo.js / centres.js.
 */
import AS from '../../legacy';
import type { Candidate, Centre, Course, District, DistrictStatusDef, Kpis } from '../../types/domain';

const db = () => AS.db;

export const districts = () => db().districts;
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const district = (code: string): District | undefined => db().districtBy[code];
export const districtStatus = (d: District): DistrictStatusDef => db().DISTRICT_STATUS[d.status];
export interface DistrictRow { d: District; k: Kpis; st: DistrictStatusDef }
export const districtRow = (d: District): DistrictRow => ({ d, k: db().kpis(db().byDistrict(d.code), d.target), st: db().DISTRICT_STATUS[d.status] });
export const stateTotals = () => db().kpis(db().candidates, db().config.target);
export const regions = () => [...new Set(db().districts.map((d) => d.region))];
export const byDistrict = (code: string): Candidate[] => db().byDistrict(code);
export const byTaluka = (code: string, t: string): Candidate[] => db().byTaluka(code, t);
export const byCentre = (id: string): Candidate[] => db().byCentre(id);
export const kpis = (rows: Candidate[], target: number): Kpis => db().kpis(rows, target);
export const talukaRollup = (code: string) => db().talukaRollup(code);
export const coordinator = (id: string) => db().coordinators.find((c) => c.id === id);
export const tasksFor = (code: string) => db().tasks.filter((t) => t.district === code);

export const centres = () => db().centres;
export const allCentres = () => db().allCentres;
export const centre = (id: string): Centre | undefined => db().centreBy[id];
export const onlineUnit = () => db().onlineUnit;
export const batches = () => db().batches;
export const trainers = () => db().trainers;
export const course = (id: string): Course => db().courses.find((x) => x.id === id) as Course;
export const centreName = (id: string): string => db().centreBy[id].name;
export const liveSessions = () => db().liveSessions;
export const mapProvider = () => AS.map.provider;

/* Districts page filter (AS.state.geo semantics). */
export interface GeoFilter extends Record<string, string> { sort: string; filter: string; region: string }
export const DEFAULT_GEO: GeoFilter = { sort: 'performance', filter: 'ALL', region: 'ALL' };
const RAG_FILTER: Record<string, string> = { critical: 'RED', amber: 'AMBER', green: 'GREEN', grey: 'GREY' };
export function filterDistricts(s: GeoFilter): DistrictRow[] {
  let rows = db().districts.map(districtRow);
  if (s.region !== 'ALL') rows = rows.filter((x) => x.d.region === s.region);
  if (RAG_FILTER[s.filter]) rows = rows.filter((x) => x.st.rag === RAG_FILTER[s.filter]);
  if (s.filter === 'centres') rows = rows.filter((x) => x.d.hasCentre);
  rows.sort((a, b) => {
    if (s.sort === 'performance') return b.k.achievementPct - a.k.achievementPct;
    if (s.sort === 'lowest') return a.k.achievementPct - b.k.achievementPct;
    if (s.sort === 'enrolled') return b.k.enrolled - a.k.enrolled;
    if (s.sort === 'name') return a.d.name < b.d.name ? -1 : 1;
    return 0;
  });
  return rows;
}

/* Centres page filter (AS.state.centre semantics). */
export interface CentreFilter extends Record<string, string> { district: string; status: string; mode: string; perf: string }
export const DEFAULT_CENTRE: CentreFilter = { district: 'ALL', status: 'ALL', mode: 'ALL', perf: 'ALL' };
export function filterCentres(f: CentreFilter): Centre[] {
  return db().allCentres.filter((c) =>
    (f.district === 'ALL' || c.districtId === f.district)
    && (f.status === 'ALL' || c.status === f.status)
    && (f.mode === 'ALL' || c.mode === f.mode)
    && !(f.perf === 'high' && c.score < 80)
    && !(f.perf === 'mid' && (c.score < 70 || c.score >= 80))
    && !(f.perf === 'low' && c.score >= 70));
}

/* Task create/detail still live in the Tasks module (not yet converted). */
export const newTask = (code: string) => AS.actions.newTask(code);
export const openTask = (id: string) => AS.actions.openTask(id);
