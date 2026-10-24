import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';

/* Breadcrumb trail shared by the Announcements pages: the ticker is a tab of Home Page Management. */
export const ANNOUNCEMENTS_CRUMBS = homePageCrumbs('announcements');

/* The ticker's tab of Home Page Management: where Back, Cancel and Save return to. */
export const ANNOUNCEMENTS_TAB_PATH = homePageTabPath('announcements');

/* An announcement's read-only View page, opened by the eye button and by a click on its row in the tab's table. */
export const announcementViewPath = (id: string): string => `/cms/announcements/${encodeURIComponent(id)}/view`;

/* An announcement's Edit page. */
export const announcementEditPath = (id: string): string => `/cms/announcements/${encodeURIComponent(id)}/edit`;

/* How an announcement is named in messages: Marathi and English titles, as the website shows them. */
export const announcementLabel = (a: { title: { mr: string; en: string } }): string => `${a.title.mr} / ${a.title.en}`;

/* Used when the ticker's own label has not loaded yet; the seeded default. */
export const FALLBACK_TICKER_LABEL = { mr: 'सूचना', en: 'Announcements' };
