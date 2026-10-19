/*
 * Governance & platform data (tasks, documents, reports, finance, PMO, QA,
 * LMS, student app, users, audit, settings) from the AS.db mock service.
 */
import AS from '../../legacy';
import type { DocumentRecord, ProgrammeConfig, Role, Task } from '../../types/domain';

export const db = () => AS.db;
export const districtName = (id: string | null): string => (id ? AS.db.districtBy[id].name : '—');
export const centreName = (id: string | null): string => (id ? AS.db.centreBy[id].name : '—');
export const roleOf = (k: string): Role | undefined => AS.db.ROLES.find((r) => r.k === k);

/* ---------- tasks ---------- */
export interface TaskFilter extends Record<string, string> {
  priority: string;
  status: string;
  type: string;
  owner: string;
}
export const DEFAULT_TASK: TaskFilter = { priority: 'ALL', status: 'ALL', type: 'ALL', owner: 'ALL' };
export function filterTasks(f: TaskFilter): Task[] {
  return AS.db.tasks.filter(
    (t) =>
      (f.priority === 'ALL' || t.priority === f.priority) &&
      (f.status === 'ALL' || t.status === f.status) &&
      (f.type === 'ALL' || t.type === f.type) &&
      (f.owner === 'ALL' || t.owner === f.owner),
  );
}
export const task = (id: string): Task | undefined => AS.db.tasks.find((t) => t.id === id);
export function updateTaskStatus(id: string, status: Task['status']): void {
  const t = task(id);
  if (t) t.status = status;
}
export const taskOwners = (): { name: string }[] => [...AS.db.pmoTeam, ...AS.db.coordinators];

/* ---------- documents ---------- */
export interface DocFilter extends Record<string, string> {
  category: string;
  status: string;
}
export const DEFAULT_DOC: DocFilter = { category: 'ALL', status: 'ALL' };
export const filterDocs = (f: DocFilter): DocumentRecord[] =>
  AS.db.documents.filter((d) => (f.category === 'ALL' || d.category === f.category) && (f.status === 'ALL' || d.status === f.status));

/* ---------- reports ---------- */
export const REPORTS: [id: string, title: string, description: string][] = [
  ['state', 'State Dashboard Report', 'Consolidated state-level programme performance'],
  ['district', 'District Report', 'District-wise targets, achievement and status'],
  ['taluka', 'Taluka Report', 'Taluka-level rollup within a district'],
  ['centre', 'Centre Report', 'Centre performance, capacity and scoring'],
  ['batch', 'Batch Report', 'Batch register with progress and attendance'],
  ['student', 'Student Report', 'Full candidate master extract'],
  ['attendance', 'Attendance Report', 'Attendance by district, centre, batch and student'],
  ['assessment', 'Assessment Report', 'Theory, practical and pass rates'],
  ['certification', 'Certification Report', 'Certificates generated, issued and verified'],
  ['trainer', 'Trainer Report', 'Trainer pool, ToT and performance'],
  ['marketing', 'Marketing Report', 'Campaign reach, leads and conversion'],
  ['mobilization', 'Mobilization Report', 'Lead to enrollment conversion'],
  ['mode', 'Training Mode Report', 'Offline vs online comparison'],
  ['completion', 'Completion Report', 'Completion and dropout analysis'],
];

/* ---------- settings ---------- */
/* Session-only config change; returns how many values changed. */
export function saveConfig(values: Partial<ProgrammeConfig>): number {
  let changed = 0;
  const config = AS.db.config as unknown as Record<string, unknown>;
  (Object.keys(values) as (keyof ProgrammeConfig)[]).forEach((k) => {
    if (config[k] !== values[k]) {
      config[k] = values[k];
      changed++;
    }
  });
  return changed;
}
