import { destinationProblem, normalizeDestination } from '../../destination';
import type { FieldErrors } from '../../validation';
import { QUICK_ACTION_ICONS } from '../constants';
import type { ApiQuickAction, Bilingual, QuickActionField, QuickActionInput } from '../types/quickactions.types';

/*
 * Quick Actions form rules, deliberately identical to the server rules for /cms/quick-actions: a title in both
 * languages (one line, at most 40 characters), a subtitle in both languages or in neither (at most 60), one of the
 * listed icons, and a destination by the rule every other CMS link follows.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface QuickActionFormValues {
  /* Both languages are required: the tile reads in whichever language the visitor has chosen. */
  title: Bilingual;
  /* Blank in both languages: the tile shows the title alone. */
  subtitle: Bilingual;
  /* Blank until one is picked; required. */
  icon: string;
  /* Required: a tile without a destination is meaningless. */
  link: string;
  /** Text, because blank is allowed on create ("end of the strip"). */
  displayOrder: string;
  isActive: boolean;
}

export const TITLE_MAX = 40;
export const SUBTITLE_MAX = 60;

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptyQuickActionForm = (): QuickActionFormValues => ({
  title: blank(),
  subtitle: blank(),
  icon: '',
  link: '',
  displayOrder: '',
  isActive: true,
});

export const quickActionToForm = (a: ApiQuickAction): QuickActionFormValues => ({
  title: { ...a.title },
  subtitle: { ...a.subtitle },
  icon: a.icon,
  link: a.link,
  displayOrder: String(a.displayOrder),
  isActive: a.isActive,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* A subtitle blank in both languages is no subtitle: sent as null, which the server stores as none. */
const subtitleOf = (p: Bilingual): Bilingual | null => {
  const v = pairOf(p);
  return v.mr || v.en ? v : null;
};

/* The link as the server stores it: "www.example.gov.in" becomes "https://www.example.gov.in". */
const linkOf = (v: string) => normalizeDestination(v.trim());

/* Every field of the form, as the API takes it. */
export function quickActionPayload(v: QuickActionFormValues): QuickActionInput {
  const order = v.displayOrder.trim();
  return {
    title: pairOf(v.title),
    subtitle: subtitleOf(v.subtitle),
    icon: v.icon,
    link: linkOf(v.link),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy. A subtitle cleared in both languages is sent as null, which removes it.
 */
export function quickActionChanges(initial: ApiQuickAction, v: QuickActionFormValues): QuickActionInput {
  const next = quickActionPayload(v);
  const out: QuickActionInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.title!, initial.title)) out.title = next.title;
  if (!samePair(next.subtitle ?? blank(), initial.subtitle)) out.subtitle = next.subtitle;
  if (next.icon !== initial.icon) out.icon = next.icon;
  if (next.link !== initial.link) out.link = next.link;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function requiredPair(errors: FieldErrors<QuickActionField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

function optionalPair(errors: FieldErrors<QuickActionField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateQuickActionForm(v: QuickActionFormValues): FieldErrors<QuickActionField> {
  const errors: FieldErrors<QuickActionField> = {};
  requiredPair(errors, 'title', v.title, 'Title', TITLE_MAX);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', SUBTITLE_MAX);
  errors.icon = !v.icon ? 'Choose an icon' : QUICK_ACTION_ICONS.some((i) => i.id === v.icon) ? undefined : 'Choose one of the listed icons';
  errors.link = v.link.trim() ? destinationProblem(v.link) : 'Destination is required';
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

/* Server 422 details ("body.title.mr", "body.link") onto this form's keys ("title.mr", "link"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<QuickActionField> {
  const out: FieldErrors<QuickActionField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
