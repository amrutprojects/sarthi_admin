/*
 * Where a CMS card may send a visitor (The SARTHI Ecosystem, SARTHI Schemes): a page of the public site
 * ("/programme") or a full http(s) address. The same rule as the server
 * (backend/src/cms/cms.link.validation.ts) and the CHECK constraints on the tables.
 */

const SITE_PATH = /^\/[A-Za-z0-9._~/?=&%#-]*$/;

/* "www.example.gov.in" is accepted as typed; the server stores it as "https://www.example.gov.in". */
export const normalizeDestination = (v: string): string => (/^www\./i.test(v) ? `https://${v}` : v);

/* A page of this site ("/programme") or a full http(s) / www. address; the same rule as the server. */
export function destinationProblem(raw: string): string | undefined {
  const v = normalizeDestination(raw.trim());
  if (!v) return undefined;
  if (v.length > 500) return 'Destination must be at most 500 characters';
  if (v.startsWith('/')) {
    return SITE_PATH.test(v) && !v.startsWith('//')
      ? undefined
      : 'A page on this site must start with a single / and use only letters, digits and - _ . ~ / ? = & % #';
  }
  if (!/^https?:\/\//.test(v))
    return 'Destination must be a page on this site starting with /, or a web address starting with https:// or www.';
  if (/[\s<>"]/.test(v)) return 'The address contains characters that are not allowed';
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return 'The address is not a valid web address';
  }
  if (url.username || url.password) return 'The address must not contain a user name or password';
  if (!url.hostname.includes('.')) return 'Enter a full address, e.g. https://example.gov.in';
  return undefined;
}

/* Pages of the public site an administrator is most likely to link to; any other path is typed in. */
export const SITE_PAGES: { path: string; label: string }[] = [
  { path: '/programme', label: 'Programme (Sarthi)' },
  { path: '/about', label: 'About' },
  { path: '/modules', label: 'Modules' },
  { path: '/eligibility', label: 'Eligibility' },
  { path: '/apply', label: 'Apply' },
  { path: '/faq', label: 'FAQ' },
  { path: '/contact', label: 'Contact' },
];
