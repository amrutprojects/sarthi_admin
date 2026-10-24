/*
 * Live student figures derived from GET /students/summary, shared by the dashboard, district, map, executive, lifecycle
 * and import screens. Pure functions (data in, chart items out); every item links to the real student list (/candidates)
 * with the matching filters.
 */
import { NO_TRACK, type BucketCounts, type StudentSummary } from './importApi';
import type { ChartItem } from '../../../types/legacy';

/* "#/candidates?bucket=eligible&centre=PUN" (empty values are left out). */
export function studentListLink(params: Record<string, string | null | undefined> = {}): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  const s = q.toString();
  return '#/candidates' + (s ? '?' + s : '');
}

export const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/* "as of 23 Oct 2026, 10:32 am" for real figures. */
export const asOfLabel = (iso: string | undefined) =>
  iso ? 'as of ' + new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/* District code -> live Applications / Eligible / Enrolled; read it with centreCounts (a missing code reads as zeros). */
export function centreIndex(s: StudentSummary | undefined): Record<string, BucketCounts> {
  const out: Record<string, BucketCounts> = {};
  s?.byCentre.forEach((c) => {
    out[c.code] = { applications: c.applications, eligible: c.eligible, enrolled: c.enrolled };
  });
  return out;
}
const ZERO: BucketCounts = { applications: 0, eligible: 0, enrolled: 0 };
export const centreCounts = (idx: Record<string, BucketCounts>, code: string): BucketCounts => idx[code] ?? ZERO;

/*
 * Top districts by enrolled students. While nobody is enrolled yet (no batches) the bar ranks eligible students instead,
 * so the card still says something; `metric` tells the caller which one it shows.
 */
export function topCentres(s: StudentSummary, n = 8): { metric: 'enrolled' | 'eligible'; items: ChartItem[] } {
  const metric = s.byCentre.some((c) => c.enrolled > 0) ? 'enrolled' : 'eligible';
  const items = s.byCentre
    .filter((c) => c[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((c) => ({ l: c.name, v: c[metric], link: studentListLink({ bucket: metric, centre: c.code }) }));
  return { metric, items };
}

/* Applications per track (T01..T12, then "to be confirmed"), tracks with students only. */
export function trackItems(s: StudentSummary, centre?: string): ChartItem[] {
  return s.byTrack
    .filter((t) => t.applications > 0)
    .map((t) => ({
      l: t.code ? `${t.code} · ${t.name}` : 'Track to be confirmed',
      v: t.applications,
      link: studentListLink({ track: t.code ?? NO_TRACK, centre }),
    }));
}

export const SOURCE_LABEL: Record<string, string> = { IMPORT: 'Imported', PUBLIC_REGISTRATION: 'Registration' };
const SOURCE_COLOUR: Record<string, string> = { IMPORT: '#C8651C', PUBLIC_REGISTRATION: '#1E7A46' };

export function sourceItems(s: StudentSummary, centre?: string): ChartItem[] {
  return s.bySource.map((x) => ({
    l: SOURCE_LABEL[x.source] ?? x.source,
    v: x.count,
    c: SOURCE_COLOUR[x.source],
    link: studentListLink({ source: x.source, centre }),
  }));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* '2026-10' -> 'Oct 26'. */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y.slice(2)}`;
};
