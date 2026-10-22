/*
 * Rich text "sanitised; no scripts" (F-LMS-07-06, F-LMS-29-06, F-LMS-32-05 / -07): the backend's ALLOW-LIST
 * (src/lms/course/course.validator.ts isAllowedRichText), copied rule for rule so the form refuses what the
 * server refuses, with the same message:
 *   - <p> <br> <strong> <em> <b> <i> <u> <ul> <ol> <li>, without attributes;
 *   - <a href="https://…"> with optional target="_blank" and rel="…" (no entities in the link but &amp;).
 * Anything else a browser would read as markup is refused. A "<" that cannot open a tag ("a < b") is plain text.
 * The View page renders stored text as markup only when it passes this same check.
 */
export const RICH_TEXT_REFUSED = 'Use only paragraphs, bold, italic, lists and https links; remove other markup and scripts.';

export const RICH_TEXT_HINT =
  'Formatting allowed: <p>, <br>, <strong>, <em>, <b>, <i>, <u>, <ul>, <ol>, <li> and links <a href="https://…">. Any other markup is refused.';

const RICH_TEXT_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a']);
const TAG = /<(\/?)([a-z]+)((?:[ \t\n\f\r]+[a-z]+="[^"<>]*")*)[ \t\n\f\r]*(\/?)>/y;
const ATTRIBUTE = /[ \t\n\f\r]+([a-z]+)="([^"<>]*)"/g;
const HTTPS_URL = /^https:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;

/* "<" followed by a letter, "/", "!" or "?" starts markup in a browser. */
const opensMarkup = (v: string): boolean => /<[a-zA-Z/!?]/.test(v);

function allowedTag(close: string, name: string, attrs: string, selfClose: string): boolean {
  if (!RICH_TEXT_TAGS.has(name)) return false;
  if (close) return !attrs && !selfClose && name !== 'br';
  if (name === 'br') return !attrs;
  if (selfClose) return false;
  if (name !== 'a') return !attrs;
  const seen = new Map<string, string>();
  for (const [, key, value] of attrs.matchAll(ATTRIBUTE)) {
    if (seen.has(key)) return false;
    seen.set(key, value);
  }
  const href = seen.get('href');
  return (
    href !== undefined &&
    !/&(?!amp;)/.test(href) &&
    HTTPS_URL.test(href.replace(/&amp;/g, '&')) &&
    [...seen.keys()].every((k) => k === 'href' || k === 'target' || k === 'rel') &&
    (!seen.has('target') || seen.get('target') === '_blank') &&
    (!seen.has('rel') || /^[a-z]+(?: [a-z]+)*$/.test(seen.get('rel')!))
  );
}

/* True when every piece of markup in the text is on the allow-list. */
export function isAllowedRichText(text: string): boolean {
  for (let i = text.indexOf('<'); i !== -1; i = text.indexOf('<', i + 1)) {
    if (!opensMarkup(text.slice(i, i + 2))) continue;
    TAG.lastIndex = i;
    const m = TAG.exec(text);
    if (!m || !allowedTag(m[1], m[2], m[3], m[4])) return false;
    i = TAG.lastIndex - 1;
  }
  return true;
}
