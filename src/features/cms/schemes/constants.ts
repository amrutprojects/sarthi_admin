/* Breadcrumb trail shared by the AMRUT Schemes Management pages. */
export const SCHEMES_CRUMBS = [
  { l: 'Dashboard', link: '/dashboard' },
  { l: 'CMS' },
  { l: 'AMRUT Schemes Management', link: '/cms/amrut-schemes' },
];

/* Used when the section's own default label has not loaded yet; the seeded default. */
export const FALLBACK_BUTTON_LABEL = { mr: 'अधिक जाणून घ्या', en: 'Learn more' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/*
 * "2027-03-31" → "31 Mar 2027", the website's format. Read from the digits themselves, never through
 * a Date, so no time zone can move it a day.
 */
export function fmtDeadline(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!m) return iso ?? '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/* Today as "YYYY-MM-DD" in the administrator's own calendar. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* A last date before today. Informational only: nothing hides or deletes an expired scheme. */
export const isExpired = (deadline: string | null, today = todayIso()) => !!deadline && deadline < today;
