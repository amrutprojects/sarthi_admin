/* The website's page banners, as /api/v1/cms/page-banners returns and accepts them. */

/** The five pages whose banner (the title and subtitle at the top of the page) can be changed, in list order. */
export type PageBannerKey = 'about' | 'faq' | 'programme' | 'track' | 'verify';

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/**
 * One page's banner. The list always has all five keys in the order above. Each half is the page's own text in both
 * languages, or null for the website's default; a page the server has no row for comes back all default, with no
 * updatedAt.
 */
export interface PageBanner {
  key: string;
  title: Bilingual | null;
  subtitle: Bilingual | null;
  updatedAt: string | null;
}

/**
 * The PUT body: strict, so nothing else may be sent, and at least one of the two. null (or both halves blank) puts
 * the website's default back for that half.
 */
export interface UpdatePageBannerInput {
  title?: Bilingual | null;
  subtitle?: Bilingual | null;
}
