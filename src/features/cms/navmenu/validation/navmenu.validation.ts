/*
 * The Edit name form's rules, kept identical to the server's (PUT /cms/nav-menu/:key, body.label): both halves
 * trimmed; both blank = the website's default name; one half blank is refused; each at most 40 characters; no line
 * breaks or control characters. The server checks every request again, and its 422 lands on the same fields.
 */
import type { FieldErrors } from '../../validation';
import type { Bilingual } from '../types/navmenu.types';

export const NAME_MAX = 40;

export type NameField = 'label.mr' | 'label.en' | 'label';

/* Line breaks, tabs and the other control characters. */
const CONTROL_RE = /\p{Cc}/u;

const half = (raw: string, label: string, other: string): string | undefined => {
  const value = raw.trim();
  if (!value) return other.trim() ? `Enter the ${label} name too, or leave both blank to use the default name` : undefined;
  if (value.length > NAME_MAX) return `${label} name must be at most ${NAME_MAX} characters`;
  if (CONTROL_RE.test(value)) return `${label} name may not contain line breaks or control characters`;
  return undefined;
};

export function validateName(values: Bilingual): FieldErrors<NameField> {
  return {
    'label.mr': half(values.mr, 'Marathi', values.en),
    'label.en': half(values.en, 'English', values.mr),
  };
}

/*
 * What Save sends: null (the default name) when both halves are blank or are the default name itself, so the item
 * keeps following the website's default instead of a copy of it; otherwise both halves trimmed.
 */
export function namePayload(values: Bilingual, defaults: Bilingual): Bilingual | null {
  const mr = values.mr.trim();
  const en = values.en.trim();
  if (!mr && !en) return null;
  if (mr === defaults.mr && en === defaults.en) return null;
  return { mr, en };
}

/* A 422's field messages ("body.label.mr", "body.label.en", "body.label") on the form's fields. */
export function serverNameErrors(details: { field?: string; message: string }[]): FieldErrors<NameField> {
  const out: FieldErrors<NameField> = {};
  for (const d of details) {
    const key = (d.field ?? '').replace(/^body\./, '') as NameField;
    if ((key === 'label.mr' || key === 'label.en' || key === 'label') && !out[key]) out[key] = d.message;
  }
  return out;
}
