import { HOME_PAGE_TABS, type HomePageTab } from '../../../constants/navigation';
import type { Action } from '../../../modules/auth/permissions';
import type { SectionVisibilityKey } from './visibility.types';

/*
 * Whether a Home Page Management tab is a home page section, with a "Show on website" switch above its content:
 * every tab but the Navigation Menu, whose items each have a switch of their own.
 */
export const isVisibilitySection = (tab: HomePageTab): tab is SectionVisibilityKey => tab !== 'nav-menu';

/* The tabs that are sections, in tab order: the ones GET /cms/section-visibility can list. */
export const VISIBILITY_TABS = HOME_PAGE_TABS.filter((t): t is Extract<(typeof HOME_PAGE_TABS)[number], { k: SectionVisibilityKey }> =>
  isVisibilitySection(t.k),
);

/*
 * The action that lets a user switch a section: its menu's update permission (<menu>.update), the same one its
 * Edit and Settings pages need. Hero and glance share cms-hero, as their tabs do.
 */
export const VISIBILITY_UPDATE_ACTION: Record<SectionVisibilityKey, Action> = {
  'top-bar': 'updateTopBar',
  'brand-bar': 'updateBrandBar',
  announcements: 'updateAnnouncement',
  hero: 'updateHero',
  glance: 'updateHero',
  diploma: 'updateHighlight',
  board: 'updateBoardMember',
  impact: 'updateImpactStat',
  ecosystem: 'updateEcosystemProgramme',
  schemes: 'updateScheme',
  about: 'updateAbout',
};

/*
 * What else hiding a section takes off the website, or where else it disappears from: said in the confirmation
 * before hiding, and under the switch while hidden. Sections with nothing beyond themselves have no entry.
 */
export const HIDE_CONSEQUENCE: Partial<Record<SectionVisibilityKey, string>> = {
  'top-bar': 'The Marathi / English language switch is part of the top bar and is hidden with it.',
  'brand-bar': 'The AMRUT KALASH name and its link to the home page are hidden.',
  hero: 'The Programme at a glance card is inside the banner and is hidden with it.',
  glance: 'Only the card is hidden; the banner then uses the full width.',
  board: 'Hidden on the home page and on the About page.',
  ecosystem: 'Its View All page sends visitors to the home page.',
  schemes: 'Its View All page sends visitors to the home page.',
  about: 'Hidden on the home page and on the About page.',
};
