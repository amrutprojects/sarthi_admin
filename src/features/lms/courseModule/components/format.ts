import { RELEASE_FIELD_LABELS, type ModuleHours, type ReleaseField } from '../types/courseModule.types';

/* Display helpers shared by the Module Master list, view and prescribed-values table. */

const num = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/* "60 h", "22.5 h", or a dash when not entered yet. */
export const fmtHours = (n: number | null): string => (n === null ? '—' : `${num(n)} h`);

/* The server refuses to delete a module that is no longer a draft (L-06). */
export const NOT_DELETABLE = 'A module that is in a published release is retired, never deleted.';

/* "Module 3". */
export const moduleLabel = (n: number) => `Module ${n}`;

type Delivery = Pick<ModuleHours, 'sessions' | 'sessionHours' | 'lectureHours' | 'practicalHours'>;

/* "30 × 2 h" and / or "150 h lecture + 150 h practical"; a dash when no pattern is entered. */
export function deliveryText(h: Delivery): string {
  const parts: string[] = [];
  if (h.sessions !== null && h.sessionHours !== null) parts.push(`${num(h.sessions)} × ${num(h.sessionHours)} h`);
  if (h.lectureHours !== null && h.practicalHours !== null) parts.push(`${num(h.lectureHours)} h lecture + ${num(h.practicalHours)} h practical`);
  return parts.length ? parts.join(' · ') : '—';
}

/* "42–48 h", or a dash. */
export const oftText = (h: Pick<ModuleHours, 'oftHoursMin' | 'oftHoursMax'>): string =>
  h.oftHoursMin === null || h.oftHoursMax === null ? '—' : `${num(h.oftHoursMin)}–${num(h.oftHoursMax)} h`;

/* "70–80 % of the core hours" (BRL-336 gives OFT as 70–80 % of the core hours; information only, not a rule). */
export function oftShare(h: Pick<ModuleHours, 'oftHoursMin' | 'oftHoursMax' | 'coreHours'>): string | null {
  if (h.oftHoursMin === null || h.oftHoursMax === null || !h.coreHours) return null;
  const pct = (v: number) => Math.round((v / h.coreHours!) * 100);
  return `${pct(h.oftHoursMin)}–${pct(h.oftHoursMax)} % of the core hours`;
}

/* The API's missingForRelease names as labels; an unknown name is shown as sent. */
export const releaseLabel = (field: string): string => RELEASE_FIELD_LABELS[field as ReleaseField] ?? field;
