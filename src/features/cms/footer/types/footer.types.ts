/* Footer Management, as /api/v1/cms/footer returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are always required. */
export interface Bilingual {
  mr: string;
  en: string;
}

/*
 * How a footer line behaves, which decides the element the public site renders:
 *   INTERNAL    — a route inside the site; href is an app path  → a link
 *   EXTERNAL    — an off-site link; href is http(s)             → a link opening in a new tab
 *   TEXT        — a plain line, such as an address              → text
 *   UNAVAILABLE — in the design, no destination in this build   → a control raising a notice
 */
export const FOOTER_LINK_KINDS = ['INTERNAL', 'EXTERNAL', 'TEXT', 'UNAVAILABLE'] as const;
export type FooterLinkKind = (typeof FOOTER_LINK_KINDS)[number];

export const LINK_KIND_LABEL: Record<FooterLinkKind, string> = {
  INTERNAL: 'Page on this site',
  EXTERNAL: 'External website',
  TEXT: 'Plain text',
  UNAVAILABLE: 'Not available yet',
};

/** Only these two carry a destination; the others must not. */
export const LINKING_KINDS: readonly FooterLinkKind[] = ['INTERNAL', 'EXTERNAL'];

/*
 * The footer layout holds at most two link columns.
 *
 * This is not a data limit but a layout one: the public stylesheet lays `.gov-foot-in` out as a
 * four-column grid — About, two link columns, Contact — so a third would wrap the footer onto a
 * second row on every page of the site. The backend enforces the same cap.
 */
export const MAX_LINK_COLUMNS = 2;

/*
 * The four tabs of Footer Management, one per part of the public footer, named as in the edit form. The
 * active tab is kept in the URL (?tab=), as on Modules Page Management.
 */
export const FOOTER_TABS = [
  { k: 'about', l: 'About column' },
  { k: 'links', l: 'Link columns' },
  { k: 'contact', l: 'Contact column' },
  { k: 'bottom', l: 'Bottom bar' },
] as const;
export type FooterTab = (typeof FOOTER_TABS)[number]['k'];

export interface ApiFooterLink {
  id: string;
  kind: FooterLinkKind;
  label: Bilingual;
  href: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ApiFooterColumn {
  id: string;
  heading: Bilingual;
  displayOrder: number;
  isActive: boolean;
  links: ApiFooterLink[];
}

export interface ApiFooter {
  id: string;
  about: {
    heading: Bilingual;
    body: Bilingual;
    partnerLabel: Bilingual;
    partnerName: string;
  };
  linkColumns: ApiFooterColumn[];
  contact: {
    heading: Bilingual;
    address: Bilingual;
    email: string;
    phone: string;
    links: ApiFooterLink[];
  };
  bottom: {
    copyright: Bilingual;
    disclaimer: Bilingual;
  };
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFooterLinkInput {
  kind: FooterLinkKind;
  label: Bilingual;
  href?: string | null;
  displayOrder: number;
  isActive: boolean;
}

/* The whole footer is submitted at once; the backend saves it in a single transaction. */
export interface UpdateFooterInput {
  about: {
    heading: Bilingual;
    body: Bilingual;
    partnerLabel: Bilingual;
    partnerName: string;
  };
  linkColumns: {
    heading: Bilingual;
    displayOrder: number;
    isActive: boolean;
    links: UpdateFooterLinkInput[];
  }[];
  contact: {
    heading: Bilingual;
    address: Bilingual;
    email: string;
    phone: string;
    links: UpdateFooterLinkInput[];
  };
  bottom: {
    copyright: Bilingual;
    disclaimer: Bilingual;
  };
  isPublished: boolean;
}

/*
 * Error keys are built as paths rather than drawn from a fixed list, because the columns and their
 * links are lists an administrator adds to — "linkColumns.0.links.3.label.mr" names one input.
 */
export type FooterField = string;
