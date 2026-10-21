/* Home page figures, as /api/v1/cms/home returns and accepts them. */

/**
 * The home page's "Programme at a glance" card.
 *
 * Three of the four are DERIVED from the modules — total hours is the sum of each active module's
 * own total, and the module and domain counts are the lists themselves — so they cannot contradict
 * the Modules page and are read-only. Only the district count is entered.
 */
export interface ApiHomeGlance {
  totalHours: number;
  modules: number;
  domains: number;
  districtCount: number;
  /** "4 × 120 hours" when every module runs the same length, otherwise just the count. */
  modulesLabel: string;
  /** Modules switched off, and so absent from both the website and the figures above. */
  hiddenModules: number;
  updatedAt: string;
}

export interface UpdateHomeGlanceInput {
  districtCount: number;
}
