import type { FormFieldTranslations } from '../types/formField.types';

/* Plain-language summary of a field's rules, as the form applies them. */
export function ruleSummary(
  dataType: string,
  rules: Record<string, unknown>,
  fileConstraints?: { extensions: readonly string[]; maxBytes: number },
): string[] {
  const out: string[] = [];
  const n = (k: string) => (typeof rules[k] === 'number' ? (rules[k] as number) : undefined);
  const s = (k: string) => (typeof rules[k] === 'string' && rules[k] !== '' ? (rules[k] as string) : undefined);
  const range = (lo: number | string | undefined, hi: number | string | undefined, unit: string, between: (a: string, b: string) => string) => {
    if (lo !== undefined && hi !== undefined) out.push(between(String(lo), String(hi)));
    else if (lo !== undefined) out.push(`At least ${lo}${unit}`);
    else if (hi !== undefined) out.push(`At most ${hi}${unit}`);
  };
  const known = new Set(['minLength', 'maxLength', 'pattern', 'min', 'max', 'integer', 'notInFuture', 'minDate', 'maxDate', 'minSelected', 'maxSelected', 'extensions', 'mimeTypes', 'maxBytes']);

  range(n('minLength'), n('maxLength'), ' characters', (a, b) => `${a}–${b} characters`);
  if (s('pattern')) out.push(`Pattern ${s('pattern')}`);
  range(n('min'), n('max'), '', (a, b) => `Between ${a} and ${b}`);
  if (rules.integer === true) out.push('Whole numbers only');
  if (rules.notInFuture === true) out.push('Not in the future');
  const minDate = s('minDate');
  const maxDate = s('maxDate');
  if (minDate && maxDate) out.push(`From ${minDate} to ${maxDate}`);
  else if (minDate) out.push(`On or after ${minDate}`);
  else if (maxDate) out.push(`On or before ${maxDate}`);
  range(n('minSelected'), n('maxSelected'), ' selected', (a, b) => `Choose ${a}–${b}`);

  /* File: the spec's fixed rule (the effective configuration carries it; the form options otherwise). */
  const ext = Array.isArray(rules.extensions) ? (rules.extensions as string[]) : dataType === 'FILE' ? fileConstraints?.extensions : undefined;
  const max = typeof rules.maxBytes === 'number' ? rules.maxBytes : dataType === 'FILE' ? fileConstraints?.maxBytes : undefined;
  if (ext?.length) out.push(`${ext.map((e) => e.toUpperCase()).join(', ')}${max ? ` up to ${Math.round((max / (1024 * 1024)) * 10) / 10} MB` : ''}`);

  /* A catalogue rule this screen has no wording for is still shown, as is. */
  for (const [k, v] of Object.entries(rules)) if (!known.has(k)) out.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  return out;
}

/* The label / help text a language shows: its translation, else the default. '' = the default. */
export const labelIn = (f: { label: string; translations?: FormFieldTranslations }, lang: string) =>
  (lang && f.translations?.[lang]?.label) || f.label;
export const helpIn = (f: { helpText: string | null; translations?: FormFieldTranslations }, lang: string) =>
  (lang && f.translations?.[lang]?.helpText) || f.helpText;

export const yesNo = (v: boolean) => (v ? 'Yes' : 'No');
