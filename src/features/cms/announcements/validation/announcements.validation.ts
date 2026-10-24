import { destinationProblem } from '../../destination';
import type { FieldErrors } from '../../validation';
import type {
  AnnouncementInput,
  AnnouncementsField,
  ApiAnnouncement,
  ApiAnnouncementsSection,
  Bilingual,
  UpdateAnnouncementsSectionInput,
} from '../types/announcements.types';

/*
 * Announcements form rules, deliberately identical to the server rules in
 * backend/src/cms/announcements/announcements.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface AnnouncementFormValues {
  title: Bilingual;
  /** Blank in both languages: the ticker prints the title alone. */
  detail: Bilingual;
  /** Blank: the item is plain text, not a link. */
  link: string;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SectionFormValues {
  label: Bilingual;
  showSection: boolean;
}

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptyAnnouncementForm = (): AnnouncementFormValues => ({
  title: blank(),
  detail: blank(),
  link: '',
  displayOrder: '',
  isActive: true,
});

export const announcementToForm = (a: ApiAnnouncement): AnnouncementFormValues => ({
  title: { ...a.title },
  detail: a.detail ? { ...a.detail } : blank(),
  link: a.link ?? '',
  displayOrder: String(a.displayOrder),
  isActive: a.isActive,
});

export const sectionToForm = (s: ApiAnnouncementsSection): SectionFormValues => ({
  label: { ...s.label },
  showSection: s.showSection,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual | null, b: Bilingual | null) => (a && b ? a.mr === b.mr && a.en === b.en : a === b);

/* The detail as the API takes it: null when blank in both languages. */
const detailOf = (p: Bilingual): Bilingual | null => {
  const v = pairOf(p);
  return v.mr || v.en ? v : null;
};

/* Every field of the form, as the API takes it. */
export function announcementPayload(v: AnnouncementFormValues): AnnouncementInput {
  const order = v.displayOrder.trim();
  return {
    title: pairOf(v.title),
    detail: detailOf(v.detail),
    link: v.link.trim() || null,
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function announcementChanges(initial: ApiAnnouncement, v: AnnouncementFormValues): AnnouncementInput {
  const next = announcementPayload(v);
  const out: AnnouncementInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.title!, initial.title)) out.title = next.title;
  if (!samePair(next.detail ?? null, initial.detail)) out.detail = next.detail;
  if (next.link !== initial.link) out.link = next.link;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateAnnouncementsSectionInput {
  return {
    label: pairOf(v.label),
    showSection: v.showSection,
    expectedUpdatedAt,
  };
}

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function requiredPair(errors: FieldErrors<AnnouncementsField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

function optionalPair(errors: FieldErrors<AnnouncementsField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateAnnouncementForm(v: AnnouncementFormValues): FieldErrors<AnnouncementsField> {
  const errors: FieldErrors<AnnouncementsField> = {};
  requiredPair(errors, 'title', v.title, 'Title', 200);
  optionalPair(errors, 'detail', v.detail, 'Detail', 500);
  errors.link = destinationProblem(v.link);
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<AnnouncementsField> {
  const errors: FieldErrors<AnnouncementsField> = {};
  requiredPair(errors, 'label', v.label, 'Label', 60);
  return errors;
}

/* Server 422 details ("body.title.mr", "body.link") onto this form's keys ("title.mr", "link"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<AnnouncementsField> {
  const out: FieldErrors<AnnouncementsField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
