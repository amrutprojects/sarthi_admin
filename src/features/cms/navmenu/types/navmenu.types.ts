/* The website's menu bar items, as /api/v1/cms/nav-menu returns and accepts them. */

/** The items of the saffron menu bar, in menu order: the nine pages, then the Login / Register button. */
export type NavMenuKey = 'home' | 'about' | 'programme' | 'advisory' | 'modules' | 'eligibility' | 'apply' | 'faq' | 'contact' | 'login';

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/**
 * One item of the menu bar under the brand bar, with whether the website shows it there and in the mobile (burger)
 * menu. The list always has all ten keys in menu order; a key the server has no row for is shown, with no updatedAt.
 */
export interface NavMenuItem {
  key: string;
  /** Hidden takes the item out of the menu bar and the mobile menu only: its page still opens by its address. */
  show: boolean;
  /** The item's own name on the website, in both languages; null = the website's default name. */
  label: Bilingual | null;
  updatedAt: string | null;
}

/**
 * The PUT body: strict, so nothing else may be sent, and at least one of the two. `label: null` (or both halves
 * blank) puts the website's default name back.
 */
export interface UpdateNavMenuItemInput {
  show?: boolean;
  label?: Bilingual | null;
}
