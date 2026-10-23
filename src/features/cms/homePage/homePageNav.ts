import type { Crumb } from '../../../components/ui';
import { HOME_PAGE_PATH, HOME_PAGE_TABS, homePageTabPath, type HomePageTab } from '../../../constants/navigation';

export { homePageTabPath, type HomePageTab };

export const HOME_PAGE_TITLE = 'Home Page Management';

/* A tab's label, as its tab strip shows it. */
export const homePageTabLabel = (tab: HomePageTab): string => HOME_PAGE_TABS.find((t) => t.k === tab)?.l ?? HOME_PAGE_TITLE;

/*
 * The breadcrumb trail of a home page section's own pages (Add, Edit, Settings), before the page's own crumb:
 * Dashboard / CMS / Home Page Management / <the section's tab>, the last two linking back to the page and the tab.
 */
export const homePageCrumbs = (tab: HomePageTab): Crumb[] => [
  { l: 'Dashboard', link: '/dashboard' },
  { l: 'CMS' },
  { l: HOME_PAGE_TITLE, link: HOME_PAGE_PATH },
  { l: homePageTabLabel(tab), link: homePageTabPath(tab) },
];
