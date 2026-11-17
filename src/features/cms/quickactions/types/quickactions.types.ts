/* Quick Actions, as /api/v1/cms/quick-actions returns and accepts them. */

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/**
 * One tile of the strip under the home page banner ("Apply Now", "Check Application Status", …): the API's
 * AdminQuickAction.
 */
export interface ApiQuickAction {
  id: string;
  /** The bold line of the tile, in both languages. */
  title: Bilingual;
  /** The smaller line under the title; a blank pair when the tile has none. */
  subtitle: Bilingual;
  /** One of QUICK_ACTION_ICONS. */
  icon: string;
  /** A page of the public site ("/apply"), or an http(s) address — never blank. */
  link: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface QuickActionInput {
  title?: Bilingual;
  /** Null: no subtitle (on update, clears it). */
  subtitle?: Bilingual | null;
  icon?: string;
  link?: string;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

/* Error keys are paths, because the texts are pairs — "title.mr". */
export type QuickActionField = string;
