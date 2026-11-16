/* Home Hero Section, as /api/v1/cms/hero returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are required. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiHeroSlide {
  id: string;
  /** The small label above the heading, e.g. "Admissions open". */
  tag: Bilingual;
  title: Bilingual;
  description: Bilingual;
  /** The slide's own button. */
  ctaLabel: Bilingual;
  /** A page on the public site, such as "/apply" — never "#/apply" and never another host. */
  ctaLink: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * The "Programme at a glance" card beside the slides.
 *
 * Three of the four are DERIVED from the modules — total hours is the sum of each active module's
 * own total, and the module and domain counts are the lists themselves — so they cannot contradict
 * the Modules page and are read-only. Only the district count is entered.
 */
export interface HeroGlance {
  totalHours: number;
  modules: number;
  domains: number;
  districtCount: number;
  /** "4 × 120 hours" when every module runs the same length, otherwise just the count. */
  modulesLabel: string;
  /** Modules switched off, and so absent from both the website and the figures above. */
  hiddenModules: number;
}

export interface ApiHomeHero {
  id: string;
  /** The two buttons shown on every slide. */
  readMoreLabel: Bilingual;
  checkStatusLabel: Bilingual;
  /** Every slide, hidden ones included, in display order. */
  slides: ApiHeroSlide[];
  /** Whether the website shows the banner, the glance card inside it included; false hides the whole band. */
  isPublished: boolean;
  /**
   * Whether the website shows the glance card, while the banner is shown. Switched only from Home Page Management's
   * "Show on website"; absent from an older API, which always showed the card.
   */
  showGlance?: boolean;
  /** Null while the Modules page content has not been seeded, so there is nothing to sum. */
  glance: HeroGlance | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHeroSlideInput {
  tag: Bilingual;
  title: Bilingual;
  description: Bilingual;
  ctaLabel: Bilingual;
  ctaLink: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdateHomeHeroInput {
  readMoreLabel: Bilingual;
  checkStatusLabel: Bilingual;
  slides: UpdateHeroSlideInput[];
  isPublished: boolean;
  /** The glance card's one entered figure; left out when the card is not configured, and then untouched. */
  districtCount?: number;
  /** The updatedAt the form was opened with; the server answers 409 if the section changed since. */
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the slides are a list — "slides.2.title.mr". */
export type HeroField = string;
