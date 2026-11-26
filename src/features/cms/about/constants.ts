import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';
import type { AboutKind } from './types/about.types';

/* Breadcrumb trail shared by the About SARTHI Management pages: the section is a tab of Home Page Management. */
export const ABOUT_CRUMBS = homePageCrumbs('about');

/* The section's tab of Home Page Management: where Back, Cancel and Save return to. */
export const ABOUT_TAB_PATH = homePageTabPath('about');

/* The Add page of an information row or an About card (routes /cms/about-amrut/facts/create, /cms/about-amrut/cards/create). */
export const aboutCreatePath = (kind: AboutKind): string => `/cms/about-amrut/${kind}/create`;

/*
 * A row's or card's read-only View page (routes /cms/about-amrut/facts/:id/view and /cms/about-amrut/cards/:id/view),
 * opened by the eye button and by a click on its row in the tab's tables.
 */
export const aboutViewPath = (kind: AboutKind, id: string): string => `/cms/about-amrut/${kind}/${encodeURIComponent(id)}/view`;

/* A row's or card's Edit page (routes /cms/about-amrut/facts/:id/edit and /cms/about-amrut/cards/:id/edit). */
export const aboutEditPath = (kind: AboutKind, id: string): string => `/cms/about-amrut/${kind}/${encodeURIComponent(id)}/edit`;

/* How a confirmation names a row or card: both languages of its label / heading, e.g. "मुख्यालय / Headquarters". */
export const itemLabel = (i: { first: { mr: string; en: string } }): string => `${i.first.mr} / ${i.first.en}`;

/*
 * How each kind of list is named and validated in the panel. The lengths are the server's
 * (backend/src/cms/about/about.validator.ts); the field names are what the API calls the two texts.
 */
export const KINDS: Record<
  AboutKind,
  {
    noun: string;
    nounLower: string;
    first: { key: string; label: string; max: number; hint: string };
    second: { key: string; label: string; max: number; multiline: boolean; hint: string };
  }
> = {
  facts: {
    noun: 'Information Row',
    nounLower: 'information row',
    first: { key: 'label', label: 'Label', max: 80, hint: 'The name on the left of the row, e.g. स्थापना / Established.' },
    second: { key: 'value', label: 'Value', max: 500, multiline: false, hint: 'The text on the right of the row.' },
  },
  cards: {
    noun: 'About Card',
    nounLower: 'about card',
    first: { key: 'heading', label: 'Card heading', max: 80, hint: 'e.g. आमचे ध्येय / Our Mission.' },
    second: { key: 'description', label: 'Card description', max: 1000, multiline: true, hint: 'Line breaks are kept on the website.' },
  },
};
