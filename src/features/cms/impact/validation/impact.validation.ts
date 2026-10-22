import type { FieldErrors } from '../../validation';
import type {
  ApiImpactSection,
  ApiImpactStat,
  Bilingual,
  ImpactField,
  ImpactStatInput,
  UpdateImpactSectionInput,
} from '../types/impact.types';

/*
 * AMRUT's Impact form rules, deliberately identical to the server rules in
 * backend/src/cms/impact/impact.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface StatFormValues {
  /** The figure exactly as it should read, e.g. "6+". */
  value: string;
  label: Bilingual;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SectionFormValues {
  heading: Bilingual;
  showSection: boolean;
}

export const emptyStatForm = (): StatFormValues => ({
  value: '',
  label: { mr: '', en: '' },
  displayOrder: '',
  isActive: true,
});

export const statToForm = (s: ApiImpactStat): StatFormValues => ({
  value: s.value,
  label: { ...s.label },
  displayOrder: String(s.displayOrder),
  isActive: s.isActive,
});

export const sectionToForm = (s: ApiImpactSection): SectionFormValues => ({
  heading: { ...s.heading },
  showSection: s.showSection,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* Every field of the form, as the API takes it. */
export function statPayload(v: StatFormValues): ImpactStatInput {
  const order = v.displayOrder.trim();
  return {
    value: line(v.value),
    label: pairOf(v.label),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function statChanges(initial: ApiImpactStat, v: StatFormValues): ImpactStatInput {
  const next = statPayload(v);
  const out: ImpactStatInput = { expectedUpdatedAt: initial.updatedAt };
  if (next.value !== initial.value) out.value = next.value;
  if (!samePair(next.label!, initial.label)) out.label = next.label;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateImpactSectionInput {
  return { heading: pairOf(v.heading), showSection: v.showSection, expectedUpdatedAt };
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

function requiredPair(errors: FieldErrors<ImpactField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    errors[`${key}.${half}`] = textProblem(line(p[half]), `${label} (${lang})`, max);
  }
}

export function validateStatForm(v: StatFormValues): FieldErrors<ImpactField> {
  const errors: FieldErrors<ImpactField> = {};
  errors.value = textProblem(line(v.value), 'Value', 20);
  requiredPair(errors, 'label', v.label, 'Label', 80);
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<ImpactField> {
  const errors: FieldErrors<ImpactField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', 120);
  return errors;
}

/* Server 422 details ("body.label.mr", "body.value") onto this form's keys ("label.mr", "value"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<ImpactField> {
  const out: FieldErrors<ImpactField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
