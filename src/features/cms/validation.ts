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

/*
 * Names of organisations and catalogue entries (departments, colleges, centres, batches). Same rules as
 * the backend's entityName: may start with a digit and may contain "&", unlike place names.
 */
const ENTITY_NAME_RE = /^[\p{L}\p{M}\d][\p{L}\p{M}\d .,'’()/&-]*$/u;

export function validateEntityName(raw: string, label: string, { min = 2, max = 100 }: { min?: number; max?: number } = {}): string | undefined {
  const value = normalizeName(raw);
  if (!value) return `${label} is required`;
  if (value.length < min) return `${label} must be at least ${min} characters`;
  if (value.length > max) return `${label} must be at most ${max} characters`;
  if (!ENTITY_NAME_RE.test(value)) return `${label} may use letters, digits, spaces and . , ( ) - / & only`;
  return undefined;
}

/* Free text. Optional unless `required`; length is counted after trimming, as the server does. */
export function validateText(raw: string, label: string, { max, min = 0, required = false }: { max: number; min?: number; required?: boolean }): string | undefined {
  const value = raw.trim();
  if (!value) return required ? `${label} is required` : undefined;
  if (value.length < min) return `${label} must be at least ${min} characters`;
  if (value.length > max) return `${label} must be at most ${max} characters`;
  return undefined;
}

/* Optional value sent to the API: trimmed, and null when empty so the server stores "not recorded". */
export const optionalValue = (raw: string): string | null => (raw.trim() ? raw.trim() : null);

export const validatePinCode = (raw: string): string | undefined => (!raw.trim() || /^\d{6}$/.test(raw.trim()) ? undefined : 'Enter a 6-digit PIN code');

export const validateMobile = (raw: string): string | undefined =>
  !raw.trim() || /^[6-9]\d{9}$/.test(raw.trim()) ? undefined : 'Enter a valid 10-digit mobile number';

/* Mobile, or a landline with its STD code (0XX-XXXXXXX). Spaces are ignored, as on the server. */
export const validatePhone = (raw: string): string | undefined => {
  const v = raw.replace(/\s+/g, '');
  return !v || /^(?:[6-9]\d{9}|0\d{2,4}-?\d{6,8})$/.test(v) ? undefined : 'Enter a 10-digit mobile number or a landline with STD code';
};

export const validateEmail = (raw: string): string | undefined => {
  const v = raw.trim();
  if (!v) return undefined;
  if (v.length > 254) return 'Email must be at most 254 characters';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Enter a valid email address';
};

/*
 * Same rule as the server's optionalHttpsUrl and the column's CHECK (LIKE 'https://%'): a lower-case
 * "https://" prefix and a link that parses, with a host. Checking only the parsed protocol is not
 * enough — the URL parser lower-cases "Https://…" / "HTTPS://…" and accepts "https:host", all of which
 * the server rejects.
 */
export const validateHttpsUrl = (raw: string, max = 500): string | undefined => {
  const v = raw.trim();
  if (!v) return undefined;
  if (v.length > max) return `The link must be at most ${max} characters`;
  if (!v.startsWith('https://')) return 'Enter a valid https link';
  try {
    return new URL(v).hostname ? undefined : 'Enter a valid https link';
  } catch {
    return 'Enter a valid https link';
  }
};

/* Whole number typed into a text box. Empty is allowed unless `required`. */
export function validateWholeNumber(raw: string, label: string, { min, max, required = false }: { min: number; max: number; required?: boolean }): string | undefined {
  const v = raw.trim();
  if (!v) return required ? `${label} is required` : undefined;
  if (!/^\d+$/.test(v)) return `${label} must be a whole number`;
  const n = Number(v);
  if (n < min) return `${label} must be at least ${min}`;
  if (n > max) return `${label} must be at most ${max}`;
  return undefined;
}

/* Number sent to the API, or null when the box was left empty. */
export const optionalNumber = (raw: string): number | null => (raw.trim() ? Number(raw.trim()) : null);

/* Keystroke filter for a whole-number box. */
export const digitsKeystroke = (raw: string, maxLength = 6): string => raw.replace(/\D/g, '').slice(0, maxLength);

/* A date input's value (YYYY-MM-DD). */
export const validateDate = (raw: string, label: string, required = false): string | undefined => {
  if (!raw) return required ? `${label} is required` : undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? undefined : `Enter a valid ${label.toLowerCase()}`;
};

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
