import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';

/* Breadcrumb trail shared by the Board Members Management pages: the section is a tab of Home Page Management. */
export const BOARD_CRUMBS = homePageCrumbs('board');

/* The members' tab of Home Page Management: where Back, Cancel and Save return to. */
export const BOARD_TAB_PATH = homePageTabPath('board');

/* A member's read-only View page, opened by the eye button and by a click on its row in the tab's table. */
export const boardMemberViewPath = (id: string): string => `/cms/board-members/${encodeURIComponent(id)}/view`;

/* A member's Edit page. */
export const boardMemberEditPath = (id: string): string => `/cms/board-members/${encodeURIComponent(id)}/edit`;

/* How a member is named in messages: by name, or by office while the name is still to be supplied. */
export const memberLabel = (m: { name: string | null; designation: { en: string } }) => m.name ?? m.designation.en;
