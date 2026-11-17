/*
 * The fact sheet's two month figures, Ideal duration and Validity: a whole number of months ("6") or a range ("4-6").
 *
 * Rules identical to the backend (src/cms/programme/programme.validator.ts, and the CHECK constraints on
 * programme_page_settings) and to the website's resolveFacts:
 *   - one whole number, or two joined by a dash: a hyphen, an en dash or an em dash, with or without spaces around it;
 *   - no leading zeros ("04" is refused; 0 itself is fine);
 *   - each number at most the field's cap (Ideal duration 120, Validity 240);
 *   - in a range the first number strictly smaller than the second ("6-4" and "4-4" are refused).
 * The stored form, sent to and returned by the API, is "N" or "N-M": an ASCII hyphen and no spaces.
 */
const MONTHS = /^(0|[1-9]\d*)(?:\s*[-–—]\s*(0|[1-9]\d*))?$/;

/* The message for a typed figure, or undefined when it can be saved. Wording matches the server's 422s. */
export function monthsError(raw: string, label: string, max: number): string | undefined {
  const text = raw.trim();
  if (!text) return `${label} is required`;
  const m = MONTHS.exec(text);
  if (!m) return `${label} must be a number of months or a range such as 4-6`;
  const from = Number(m[1]);
  const to = m[2] === undefined ? undefined : Number(m[2]);
  if (from > max || (to !== undefined && to > max)) return `${label} is too large`;
  if (to !== undefined && from >= to) return `${label}: enter the smaller number first, e.g. 4-6`;
  return undefined;
}

/* The stored form of a figure that passed monthsError: "4 – 6" becomes "4-6", " 6 " becomes "6". */
export const normaliseMonths = (raw: string): string => raw.trim().replace(/\s*[-–—]\s*/, '-');

/*
 * A stored figure as the website prints it: the hyphen as an en dash, then the unit ("4-6" → "4–6 months", "6" → "6 months").
 * String() because a server not yet updated still answers with a plain number.
 */
export const formatMonths = (value: string): string => `${String(value).replace('-', '–')} months`;
