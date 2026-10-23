import type { AboutKind } from './types/about.types';

/* Breadcrumb trail shared by the About AMRUT Management pages. */
export const ABOUT_CRUMBS = [
  { l: 'Dashboard', link: '/dashboard' },
  { l: 'CMS' },
  { l: 'About AMRUT Management', link: '/cms/about-amrut' },
];

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
