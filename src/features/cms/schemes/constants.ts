import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';

/* Breadcrumb trail shared by the AMRUT Schemes Management pages: the section is a tab of Home Page Management. */
export const SCHEMES_CRUMBS = homePageCrumbs('schemes');

/* The section's tab of Home Page Management: where Back, Cancel and Save return to. */
export const SCHEMES_TAB_PATH = homePageTabPath('schemes');

/* A scheme's read-only View page, opened by the eye button and by a click on its row in the tab's table. */
export const schemeViewPath = (id: string): string => `/cms/amrut-schemes/${encodeURIComponent(id)}/view`;

/* A scheme's Edit page. */
export const schemeEditPath = (id: string): string => `/cms/amrut-schemes/${encodeURIComponent(id)}/edit`;

/* How a scheme is named in messages: Marathi and English titles, as the website shows them. */
export const schemeLabel = (s: { title: { mr: string; en: string } }): string => `${s.title.mr} / ${s.title.en}`;

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
