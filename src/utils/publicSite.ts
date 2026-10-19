const PUBLIC_SITE_URL: string = import.meta.env.VITE_PUBLIC_SITE_URL || '../index.html';

/* Paths that belong to the existing public website, not the admin panel. */
const PUBLIC_PATHS = [
  '/',
  '/home',
  '/about',
  '/programme',
  '/eligibility',
  '/apply',
  '/faq',
  '/contact',
  '/modules',
  '/track',
  '/verify',
  '/login-public',
];

export function isPublicPath(path: string): boolean {
  const p = path.split('?')[0].replace(/\/$/, '') || '/';
  return PUBLIC_PATHS.includes(p);
}

export function publicUrl(path: string): string {
  return PUBLIC_SITE_URL + '#' + path;
}
