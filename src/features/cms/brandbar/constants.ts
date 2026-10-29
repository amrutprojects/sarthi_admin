import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';

/* Breadcrumb trail shared by the Brand Bar pages: the bar is a tab of Home Page Management. */
export const BRANDBAR_CRUMBS = homePageCrumbs('brand-bar');

/* The bar's tab of Home Page Management: where Back, Cancel and Save return to. */
export const BRANDBAR_TAB_PATH = homePageTabPath('brand-bar');

/* The bar's Edit page, opened by Edit on the tab. */
export const BRANDBAR_EDIT_PATH = '/cms/brand-bar/edit';
