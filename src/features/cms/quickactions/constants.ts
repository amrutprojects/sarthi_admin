import { iconLabel } from '../ecosystem/constants';
import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';
import type { Bilingual } from './types/quickactions.types';

/* Breadcrumb trail shared by the Quick Actions pages: the strip is a tab of Home Page Management. */
export const QUICK_ACTIONS_CRUMBS = homePageCrumbs('quick-actions');

/* The strip's tab of Home Page Management: where Back, Cancel and Save return to. */
export const QUICK_ACTIONS_TAB_PATH = homePageTabPath('quick-actions');

/* The Add page, opened by the button in the tab head. */
export const QUICK_ACTION_CREATE_PATH = '/cms/quick-actions/create';

/* A tile's read-only View page, opened by the eye button and by a click on its row in the tab's table. */
export const quickActionViewPath = (id: string): string => `/cms/quick-actions/${encodeURIComponent(id)}/view`;

/* A tile's Edit page. */
export const quickActionEditPath = (id: string): string => `/cms/quick-actions/${encodeURIComponent(id)}/edit`;

/* How a tile is named in messages: Marathi and English titles, as the website shows them. */
export const quickActionName = (a: { title: Bilingual }): string => `${a.title.mr} / ${a.title.en}`;

/*
 * The icons a tile may use, in the picker's order: the same identifiers the API accepts and the website renders
 * (its data/quickactions.ts), whose glyphs are the panel's copy of the same ui.js icon set. The first four are the
 * icons of the tiles the strip showed before it was managed (Apply Now, Check Application Status, Verify
 * Certificate, Training centres).
 */
export const QUICK_ACTION_ICON_IDS = [
  'plus',
  'search',
  'qr',
  'building',
  'doc',
  'check',
  'clipboard',
  'award',
  'users',
  'teacher',
  'phone',
  'mail',
  'help',
  'download',
  'calendar',
  'pin',
  'map',
  'home',
  'globe',
  'megaphone',
  'bell',
  'eye',
  'rupee',
  'layers',
  'monitor',
  'chart',
  'shield',
  'folder',
  'settings',
  'play',
  'clock',
] as const;

/* Names for the icons The SARTHI Ecosystem's picker does not offer; every other icon keeps the name it has there. */
const OWN_LABELS: Partial<Record<(typeof QUICK_ACTION_ICON_IDS)[number], string>> = {
  plus: 'Add / apply',
  search: 'Search / track',
  help: 'Help',
  download: 'Download',
  bell: 'Notifications',
  eye: 'View',
  clock: 'Time / schedule',
};

/* The picker's options: each icon with the name shown under its glyph. */
export const QUICK_ACTION_ICONS: { id: string; label: string }[] = QUICK_ACTION_ICON_IDS.map((id) => ({
  id,
  label: OWN_LABELS[id] ?? iconLabel(id),
}));

/* An icon's name in the picker; the identifier itself for one that is not in the list. */
export const quickActionIconLabel = (id: string): string => QUICK_ACTION_ICONS.find((i) => i.id === id)?.label ?? id;
