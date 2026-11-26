/*
 * Marathi numerals, as the public website prints them (sarthi-web, src/features/public-site/shared/numerals.ts).
 *
 * While the website is in Marathi and the Top Bar's "Show numbers in Marathi digits" setting is on, every figure in
 * managed text reads in Devanagari digits (०१२३). Email and web addresses keep their digits, because a visitor copies
 * or types them back. The Top Bar preview uses this so the Marathi strip reads as the website will draw it.
 *
 * Keep the rule identical to the website's localiseDigits.
 */

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/* An email or web address, matched whole so its digits are kept; any other run of digits is converted. */
const KEEP_OR_DIGITS = /([^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+|(?:https?:\/\/|www\.)[^\s<>]+)|[0-9]+/gi;

/** Text as the Marathi site prints it: ASCII digits as Devanagari, email and web addresses as written. */
export function localiseDigits(text: string): string {
  if (!/[0-9]/.test(text)) return text;
  return text.replace(KEEP_OR_DIGITS, (match: string, keep: string | undefined) =>
    keep !== undefined ? keep : match.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]!),
  );
}
