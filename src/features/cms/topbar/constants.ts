import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';

/* Breadcrumb trail shared by the Top Bar pages: the strip is a tab of Home Page Management. */
export const TOPBAR_CRUMBS = homePageCrumbs('top-bar');

/* The strip's tab of Home Page Management: where Back, Cancel and Save return to. */
export const TOPBAR_TAB_PATH = homePageTabPath('top-bar');

/* A link's read-only View page, opened by the eye button and by a click on its row in the tab's table. */
export const topBarLinkViewPath = (id: string): string => `/cms/top-bar/${encodeURIComponent(id)}/view`;

/* A link's Edit page. */
export const topBarLinkEditPath = (id: string): string => `/cms/top-bar/${encodeURIComponent(id)}/edit`;

/* How a link is named in messages: Marathi and English labels, as the website shows them. */
export const topBarLinkName = (l: { label: { mr: string; en: string } }): string => `${l.label.mr} / ${l.label.en}`;

/* Used in the preview when the settings have not loaded yet; the seeded default. */
export const FALLBACK_GOVERNMENT_NAME = { mr: 'महाराष्ट्र शासन', en: 'Government of Maharashtra' };
