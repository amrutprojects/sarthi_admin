/*
 * Field rules for the CMS masters, kept deliberately identical to the server rules in
 * backend/src/validators/common.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form: it names the problem next to the field instead of making
 * them submit to find out. It is not a security boundary — the backend validates every request again,
 * and a 422 from the server is still surfaced on the form.
 */

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\d .,'’()/-]*$/u;

/* Trim and collapse inner whitespace, so "  Pune   City " is submitted as "Pune City". */
export const normalizeName = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

export function validateName(raw: string, label: string): string | undefined {
  const value = normalizeName(raw);
  if (!value) return `${label} is required`;
  if (value.length < 2) return `${label} must be at least 2 characters`;
  if (value.length > 100) return `${label} must be at most 100 characters`;
  if (!NAME_RE.test(value)) return `${label} may use letters, digits, spaces and . , ( ) - / only`;
  return undefined;
}

export const normalizeCode = (raw: string): string => raw.trim().toUpperCase();

interface CodeRules {
  label: string;
  max: number;
  /* District and taluka codes allow a hyphen (MH-PUN); state codes do not. */
  hyphen?: boolean;
  /* Taluka codes are optional. */
  optional?: boolean;
}

export function validateCode(raw: string, { label, max, hyphen, optional }: CodeRules): string | undefined {
  const value = normalizeCode(raw);
  if (!value) return optional ? undefined : `${label} is required`;
  if (value.length < 2) return `${label} must be at least 2 characters`;
  if (value.length > max) return `${label} must be at most ${max} characters`;
  const re = hyphen ? /^[A-Z][A-Z0-9-]*$/ : /^[A-Z][A-Z0-9]*$/;
  if (!re.test(value)) {
    return hyphen
      ? `${label} may use A–Z, 0–9 and hyphen, starting with a letter`
      : `${label} may use A–Z and 0–9 only, starting with a letter`;
  }
  return undefined;
}

export const requireSelection = (value: string, label: string): string | undefined => (value ? undefined : `${label} is required`);

/* Keystroke filter for a code input, so the field cannot hold a character the rules reject. */
export const codeKeystroke = (raw: string, hyphen?: boolean): string =>
  raw.toUpperCase().replace(hyphen ? /[^A-Z0-9-]/g : /[^A-Z0-9]/g, '');

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/* True when no field has a message. */
export const isValid = <K extends string>(errors: FieldErrors<K>): boolean => Object.values(errors).every((v) => !v);

/*
 * Field-level messages the backend returned (422 details carry `field: "body.code"`), mapped onto the
 * form so a server-only rule still lands next to the right input.
 */
export function serverFieldErrors<K extends string>(details: { field?: string; message: string }[], keys: readonly K[]): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const d of details) {
    const name = (d.field ?? '').split('.').pop() as K | undefined;
    if (name && keys.includes(name) && !out[name]) out[name] = d.message;
  }
  return out;
}
