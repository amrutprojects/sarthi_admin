/*
 * Dashboard data selectors. Same calculations as the original dashboard.js,
 * all derived from the AS.db candidate records (single source of truth for KPIs).
 */
import AS from '../legacy';
import type { Candidate, District, Kpis, Rag } from '../types/domain';
import type { ChartItem } from '../types/legacy';

const db = () => AS.db;

export interface DashFilter extends Record<string, string> { district: string; mode: string; metric: string }
export const DEFAULT_DASH_FILTER: DashFilter = { district: 'ALL', mode: 'ALL', metric: 'enrolled' };

export function filteredCandidates(f: DashFilter): Candidate[] {
  return db().candidates.filter((c) => (f.district === 'ALL' || c.districtId === f.district) && (f.mode === 'ALL' || c.mode === f.mode));
}

export function filteredTarget(f: DashFilter): number {
  if (f.district !== 'ALL') return db().districtBy[f.district].target;
  if (f.mode === 'OFFLINE') return 800;
  if (f.mode === 'ONLINE') return 200;
  return db().config.target;
}

export function scopeLabel(f: DashFilter): string {
  const p = [];
  if (f.district !== 'ALL') p.push(db().districtBy[f.district].name);
  if (f.mode !== 'ALL') p.push(f.mode === 'ONLINE' ? 'Online mode' : 'Offline mode');
  return p.length ? p.join(' · ') : 'Maharashtra — all ' + db().districts.length + ' districts, both modes';
}

export function dashboardKpis(f: DashFilter): Kpis {
  return db().kpis(filteredCandidates(f), filteredTarget(f));
}

export const healthScore = () => db().healthScore();
export const stateKpis = () => db().stateKpis;

export function criticalItems() {
  const D = db();
  const crit = D.districts.filter((d) => D.DISTRICT_STATUS[d.status].rag === 'RED');
  const amberC = D.centres.filter((c) => c.score < 75);
  const risk = D.atRiskCandidates();
  return [
    { color: 'var(--red)', t: crit.length + ' districts critical / delayed', s: crit.map((d) => d.name).join(', ') || 'None', link: '#/districts?filter=critical' },
    { color: 'var(--amber)', t: amberC.length + ' centres below performance benchmark', s: amberC.map((c) => c.name.split(' ')[0]).join(', ') || 'None', link: '#/centres?filter=low' },
    { color: 'var(--amber)', t: risk.length + ' students flagged at risk', s: 'Attendance, inactivity or progress concerns', link: '#/at-risk' },
    { color: 'var(--red)', t: D.tasks.filter((t) => t.priority === 'HIGH' && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length + ' high-priority open tasks', s: 'Assigned across PMO, QA and coordinators', link: '#/tasks?priority=HIGH' },
    { color: 'var(--amber)', t: D.batches.filter((b) => b.status === 'DELAYED').length + ' batch delayed', s: 'Revised schedule pending', link: '#/batches?status=DELAYED' },
  ];
}

export const liveSessions = () => db().liveSessions;
export const runningSessions = () => db().liveSessions.filter((s) => s.status === 'LIVE');
export const monthly = () => db().monthly;
export const months = () => db().months;
export const attendanceTrend = () => db().attendanceTrend;
export const asOf = () => db().config.asOf;
export const centres = () => db().centres;
export const batches = () => db().batches;
export const trainers = () => db().trainers;
export const tasks = () => db().tasks;
export const districts = () => db().districts;
export const config = () => db().config;
export const payments = () => db().payments;
export const onlineUnitId = () => db().onlineUnit.id;
export const districtName = (id: string | null): string => (id ? db().districtBy[id].name : '—');
export const trainerName = (id: string): string => db().trainerBy[id].name;
export const districtRag = (d: District): Rag => db().DISTRICT_STATUS[d.status].rag;

export function districtKpis(d: District): Kpis {
  return db().kpis(db().byDistrict(d.code), d.target);
}

export function topDistricts(): ChartItem[] {
  return db().districts
    .map((d) => {
      const k = districtKpis(d);
      return { l: d.name, v: k.enrolled, display: k.enrolled + ' / ' + d.target, link: '#/districts/' + d.code };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 8);
}

/* Task detail drawer still belongs to the Tasks module (not yet converted). */
export const openTask = (id: string) => AS.actions.openTask(id);
