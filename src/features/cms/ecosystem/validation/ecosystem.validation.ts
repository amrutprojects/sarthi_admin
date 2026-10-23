import { destinationProblem } from '../../destination';
import type { FieldErrors } from '../../validation';
import { ECOSYSTEM_ICONS } from '../constants';
import type {
  ApiEcosystemSection,
  ApiProgramme,
  Bilingual,
  EcosystemField,
  ProgrammeInput,
  UpdateEcosystemSectionInput,
} from '../types/ecosystem.types';

/*
 * The AMRUT Ecosystem form rules, deliberately identical to the server rules in
 * backend/src/cms/ecosystem/ecosystem.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface ProgrammeFormValues {
  name: Bilingual;
  description: Bilingual;
  icon: string;
  /** Blank: the card has no destination and says the page is not available yet. */
  link: string;
  /** Blank in both languages: the section's default label is used. */
  linkLabel: Bilingual;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SectionFormValues {
  heading: Bilingual;
  subtitle: Bilingual;
  linkLabel: Bilingual;
  showSection: boolean;
}

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptyProgrammeForm = (): ProgrammeFormValues => ({
  name: blank(),
  description: blank(),
  icon: '',
  link: '',
  linkLabel: blank(),
  displayOrder: '',
  isActive: true,
});

export const programmeToForm = (p: ApiProgramme): ProgrammeFormValues => ({
  name: { ...p.name },
  description: { ...p.description },
  icon: p.icon,
  link: p.link ?? '',
  linkLabel: { ...p.linkLabel },
  displayOrder: String(p.displayOrder),
  isActive: p.isActive,
});

export const sectionToForm = (s: ApiEcosystemSection): SectionFormValues => ({
  heading: { ...s.heading },
  subtitle: { ...s.subtitle },
  linkLabel: { ...s.linkLabel },
  showSection: s.showSection,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* Every field of the form, as the API takes it. */
export function programmePayload(v: ProgrammeFormValues): ProgrammeInput {
  const order = v.displayOrder.trim();
  return {
    name: pairOf(v.name),
    description: pairOf(v.description),
    icon: v.icon,
    link: v.link.trim() || null,
    linkLabel: pairOf(v.linkLabel),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function programmeChanges(initial: ApiProgramme, v: ProgrammeFormValues): ProgrammeInput {
  const next = programmePayload(v);
  const out: ProgrammeInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.name!, initial.name)) out.name = next.name;
  if (!samePair(next.description!, initial.description)) out.description = next.description;
  if (next.icon !== initial.icon) out.icon = next.icon;
  if (next.link !== initial.link) out.link = next.link;
  if (!samePair(next.linkLabel!, initial.linkLabel)) out.linkLabel = next.linkLabel;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateEcosystemSectionInput {
  return {
    heading: pairOf(v.heading),
    subtitle: pairOf(v.subtitle),
    linkLabel: pairOf(v.linkLabel),
    showSection: v.showSection,
    expectedUpdatedAt,
  };
}

/* The destination rule is shared with AMRUT Schemes (features/cms/destination.ts). */
export { destinationProblem };

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function requiredPair(errors: FieldErrors<EcosystemField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

function optionalPair(errors: FieldErrors<EcosystemField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateProgrammeForm(v: ProgrammeFormValues): FieldErrors<EcosystemField> {
  const errors: FieldErrors<EcosystemField> = {};
  requiredPair(errors, 'name', v.name, 'Programme name', 80);
  requiredPair(errors, 'description', v.description, 'Description', 200);
  errors.icon = !v.icon ? 'Choose an icon' : ECOSYSTEM_ICONS.some((i) => i.id === v.icon) ? undefined : 'Choose one of the listed icons';
  errors.link = destinationProblem(v.link);
  optionalPair(errors, 'linkLabel', v.linkLabel, 'Link label', 60);
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<EcosystemField> {
  const errors: FieldErrors<EcosystemField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', 120);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', 300);
  requiredPair(errors, 'linkLabel', v.linkLabel, 'Default link label', 60);
  return errors;
}

/* Server 422 details ("body.name.mr", "body.link") onto this form's keys ("name.mr", "link"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<EcosystemField> {
  const out: FieldErrors<EcosystemField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
