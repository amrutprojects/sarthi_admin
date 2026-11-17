import type { FieldErrors } from '../../validation';
import { CARD_TONES, DISTRICT_STATUSES } from '../constants';
import type {
  ApiLiveDashboardCard,
  ApiLiveDashboardDistrict,
  ApiLiveDashboardSettings,
  ApiLiveDashboardStat,
  Bilingual,
  CardTone,
  DistrictStatus,
  LiveDashboardCardInput,
  LiveDashboardDistrictInput,
  LiveDashboardField,
  LiveDashboardStatInput,
  UpdateLiveDashboardSettingsInput,
} from '../types/livedashboard.types';

/*
 * Live Dashboard form rules, deliberately identical to the server rules in
 * backend/src/cms/livedashboard (its validator and the CHECK constraints on the live_dashboard_* tables).
 *
 * This is for the person filling in the form — it names the problem next to the field instead of making them
 * submit to find out. The backend validates every request again regardless.
 */

/* The largest count a figure field takes: well inside the database's int, and far beyond any district's numbers. */
export const COUNT_MAX = 10_000_000;

export interface SettingsFormValues {
  heading: Bilingual;
  subtitle: Bilingual;
  disclaimer: Bilingual;
  showDisclaimer: boolean;
  mapTitle: Bilingual;
  showMap: boolean;
  modesTitle: Bilingual;
  showModes: boolean;
  offlineLabel: Bilingual;
  onlineLabel: Bilingual;
  /** Text while typed, so a half-typed number can be named as wrong instead of silently becoming 0. */
  offlineCount: string;
  onlineCount: string;
  donutCenterLabel: Bilingual;
}

export interface CardFormValues {
  label: Bilingual;
  value: string;
  detail: Bilingual;
  link: string;
  tone: CardTone;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface StatFormValues {
  label: Bilingual;
  value: string;
  displayOrder: string;
  isActive: boolean;
}

/* The district dialog's figures, as typed. */
export const DISTRICT_FIGURES = ['target', 'enrolled', 'trainingActive', 'completed', 'certified', 'attendancePct'] as const;
export type DistrictFigure = (typeof DISTRICT_FIGURES)[number];
export type DistrictFormValues = { status: DistrictStatus } & Record<DistrictFigure, string>;

const blank = (): Bilingual => ({ mr: '', en: '' });
const copy = (p: Bilingual): Bilingual => ({ mr: p.mr, en: p.en });

export const settingsToForm = (s: ApiLiveDashboardSettings): SettingsFormValues => ({
  heading: copy(s.heading),
  subtitle: copy(s.subtitle),
  disclaimer: copy(s.disclaimer),
  showDisclaimer: s.showDisclaimer,
  mapTitle: copy(s.mapTitle),
  showMap: s.showMap,
  modesTitle: copy(s.modesTitle),
  showModes: s.showModes,
  offlineLabel: copy(s.offlineLabel),
  onlineLabel: copy(s.onlineLabel),
  offlineCount: String(s.offlineCount),
  onlineCount: String(s.onlineCount),
  donutCenterLabel: copy(s.donutCenterLabel),
});

export const emptyCardForm = (): CardFormValues => ({
  label: blank(),
  value: '',
  detail: blank(),
  link: '',
  tone: 'default',
  displayOrder: '',
  isActive: true,
});

export const cardToForm = (c: ApiLiveDashboardCard): CardFormValues => ({
  label: copy(c.label),
  value: c.value,
  detail: copy(c.detail),
  link: c.link,
  tone: c.tone,
  displayOrder: String(c.displayOrder),
  isActive: c.isActive,
});

export const emptyStatForm = (): StatFormValues => ({ label: blank(), value: '', displayOrder: '', isActive: true });

export const statToForm = (s: ApiLiveDashboardStat): StatFormValues => ({
  label: copy(s.label),
  value: s.value,
  displayOrder: String(s.displayOrder),
  isActive: s.isActive,
});

export const districtToForm = (d: ApiLiveDashboardDistrict): DistrictFormValues => ({
  status: d.status,
  target: String(d.target),
  enrolled: String(d.enrolled),
  trainingActive: String(d.trainingActive),
  completed: String(d.completed),
  certified: String(d.certified),
  attendancePct: String(d.attendancePct),
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;
const orderOf = (raw: string) => (raw.trim() ? { displayOrder: Number(raw.trim()) } : {});

export function settingsPayload(v: SettingsFormValues, expectedUpdatedAt: string): UpdateLiveDashboardSettingsInput {
  return {
    heading: pairOf(v.heading),
    subtitle: pairOf(v.subtitle),
    disclaimer: pairOf(v.disclaimer),
    showDisclaimer: v.showDisclaimer,
    mapTitle: pairOf(v.mapTitle),
    showMap: v.showMap,
    modesTitle: pairOf(v.modesTitle),
    showModes: v.showModes,
    offlineLabel: pairOf(v.offlineLabel),
    onlineLabel: pairOf(v.onlineLabel),
    offlineCount: Number(v.offlineCount.trim()),
    onlineCount: Number(v.onlineCount.trim()),
    donutCenterLabel: pairOf(v.donutCenterLabel),
    expectedUpdatedAt,
  };
}

/* Every field of the card form, as the API takes it. A blank detail is sent as a blank pair: no detail line. */
export function cardPayload(v: CardFormValues): LiveDashboardCardInput {
  return {
    label: pairOf(v.label),
    value: line(v.value),
    detail: pairOf(v.detail),
    link: v.link.trim(),
    tone: v.tone,
    ...orderOf(v.displayOrder),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's update is partial,
 * so a field this form did not change is never sent and can never be cleared or overwritten by a stale copy.
 */
export function cardChanges(initial: ApiLiveDashboardCard, v: CardFormValues): LiveDashboardCardInput {
  const next = cardPayload(v);
  const out: LiveDashboardCardInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.label!, initial.label)) out.label = next.label;
  if (next.value !== initial.value) out.value = next.value;
  if (!samePair(next.detail!, initial.detail)) out.detail = next.detail;
  if (next.link !== initial.link) out.link = next.link;
  if (next.tone !== initial.tone) out.tone = next.tone;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function statPayload(v: StatFormValues): LiveDashboardStatInput {
  return { label: pairOf(v.label), value: line(v.value), ...orderOf(v.displayOrder), isActive: v.isActive };
}

export function statChanges(initial: ApiLiveDashboardStat, v: StatFormValues): LiveDashboardStatInput {
  const next = statPayload(v);
  const out: LiveDashboardStatInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.label!, initial.label)) out.label = next.label;
  if (next.value !== initial.value) out.value = next.value;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

/* Only the district's changed figures, with the version the dialog was opened at. */
export function districtChanges(initial: ApiLiveDashboardDistrict, v: DistrictFormValues): LiveDashboardDistrictInput {
  const out: LiveDashboardDistrictInput = { expectedUpdatedAt: initial.updatedAt };
  if (v.status !== initial.status) out.status = v.status;
  for (const f of DISTRICT_FIGURES) {
    const n = Number(v[f].trim());
    if (n !== initial[f]) out[f] = n;
  }
  return out;
}

/* C0 controls and DEL; whitespace ones are already collapsed into a space by line(). */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

function textProblem(v: string, label: string, max: number): string | undefined {
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  if (CONTROL.test(v)) return `${label} contains characters that are not allowed`;
  return undefined;
}

const HALVES = [
  ['mr', 'Marathi'],
  ['en', 'English'],
] as const;

/* Both halves required: the public site defaults to Marathi and has no language fallback. */
function requiredPair(errors: FieldErrors<LiveDashboardField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of HALVES) errors[`${key}.${half}`] = textProblem(line(p[half]), `${label} (${lang})`, max);
}

/* Optional text: blank in both languages, or filled in both. */
function optionalPair(errors: FieldErrors<LiveDashboardField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  for (const [half, lang] of HALVES) {
    const other = half === 'mr' ? v.en : v.mr;
    errors[`${key}.${half}`] = v[half]
      ? textProblem(v[half], `${label} (${lang})`, max)
      : other
        ? `${label} (${lang}) is required when the ${half === 'mr' ? 'English' : 'Marathi'} text is filled in`
        : undefined;
  }
}

function wholeNumber(raw: string, label: string, max: number): string | undefined {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  if (!/^\d+$/.test(v) || Number(v) > max) return `${label} must be a whole number from 0 to ${max.toLocaleString('en-IN')}`;
  return undefined;
}

function displayOrderProblem(raw: string): string | undefined {
  const order = raw.trim();
  return order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)
    ? 'Display order must be a whole number from 1 to 999'
    : undefined;
}

/*
 * '' (not a link) or a page of the public site: a path from its root in URL characters, never another site — not even
 * '//host', which a browser reads as one. The same rule as the server's and the CHECK on live_dashboard_cards.link.
 */
const SITE_PATH = /^\/[A-Za-z0-9._~/?=&%#-]*$/;
export function linkProblem(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (v.length > 200) return 'Link must be at most 200 characters';
  if (!SITE_PATH.test(v) || v.startsWith('//')) {
    return 'Link must be a page of this website starting with a single / (e.g. /programme), using only letters, digits and - _ . ~ / ? = & % #';
  }
  return undefined;
}

export function validateSettingsForm(v: SettingsFormValues): FieldErrors<LiveDashboardField> {
  const errors: FieldErrors<LiveDashboardField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', 150);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', 300);
  optionalPair(errors, 'disclaimer', v.disclaimer, 'Note', 300);
  requiredPair(errors, 'mapTitle', v.mapTitle, 'Map title', 120);
  requiredPair(errors, 'modesTitle', v.modesTitle, 'Training modes title', 120);
  requiredPair(errors, 'offlineLabel', v.offlineLabel, 'Offline label', 60);
  requiredPair(errors, 'onlineLabel', v.onlineLabel, 'Online label', 60);
  errors.offlineCount = wholeNumber(v.offlineCount, 'Offline count', COUNT_MAX);
  errors.onlineCount = wholeNumber(v.onlineCount, 'Online count', COUNT_MAX);
  requiredPair(errors, 'donutCenterLabel', v.donutCenterLabel, 'Donut centre label', 40);
  return errors;
}

export function validateCardForm(v: CardFormValues): FieldErrors<LiveDashboardField> {
  const errors: FieldErrors<LiveDashboardField> = {};
  requiredPair(errors, 'label', v.label, 'Title', 60);
  errors.value = textProblem(line(v.value), 'Value', 20);
  optionalPair(errors, 'detail', v.detail, 'Detail', 120);
  errors.link = linkProblem(v.link);
  if (!CARD_TONES.some((t) => t.id === v.tone)) errors.tone = 'Choose a colour';
  errors.displayOrder = displayOrderProblem(v.displayOrder);
  return errors;
}

export function validateStatForm(v: StatFormValues): FieldErrors<LiveDashboardField> {
  const errors: FieldErrors<LiveDashboardField> = {};
  requiredPair(errors, 'label', v.label, 'Label', 80);
  errors.value = textProblem(line(v.value), 'Value', 30);
  errors.displayOrder = displayOrderProblem(v.displayOrder);
  return errors;
}

const FIGURE_LABEL: Record<DistrictFigure, string> = {
  target: 'Target',
  enrolled: 'Enrolled',
  trainingActive: 'In training',
  completed: 'Completed',
  certified: 'Certified',
  attendancePct: 'Attendance %',
};
export const districtFigureLabel = (f: DistrictFigure): string => FIGURE_LABEL[f];

export function validateDistrictForm(v: DistrictFormValues): FieldErrors<LiveDashboardField> {
  const errors: FieldErrors<LiveDashboardField> = {};
  if (!DISTRICT_STATUSES.some((s) => s.id === v.status)) errors.status = 'Choose a status';
  for (const f of DISTRICT_FIGURES) errors[f] = wholeNumber(v[f], FIGURE_LABEL[f], f === 'attendancePct' ? 100 : COUNT_MAX);
  return errors;
}

/* Server 422 details ("body.label.mr", "body.value") onto this form's keys ("label.mr", "value"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<LiveDashboardField> {
  const out: FieldErrors<LiveDashboardField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
