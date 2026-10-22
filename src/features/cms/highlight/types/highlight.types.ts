/* Home Programme Section, as /api/v1/cms/highlight returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are required. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiObjective {
  id: string;
  text: Bilingual;
  displayOrder: number;
  isActive: boolean;
}

export interface ApiProgrammeHighlight {
  id: string;
  heading: Bilingual;
  subheading: Bilingual;
  tagline: Bilingual;
  certification: Bilingual;
  objectives: ApiObjective[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProgrammeHighlightInput {
  heading: Bilingual;
  subheading: Bilingual;
  tagline: Bilingual;
  certification: Bilingual;
  objectives: { text: Bilingual; displayOrder: number; isActive: boolean }[];
  isPublished: boolean;
}

/* Error keys are paths, because the objectives are a list — "objectives.2.text.mr". */
export type HighlightField = string;

/*
 * The two tabs of the Home Programme Section view, named as the sections of the edit form. The active tab
 * is kept in the URL (?tab=), as on Modules Page Management.
 */
export const HIGHLIGHT_TABS = [
  { k: 'text', l: 'Section text' },
  { k: 'objectives', l: 'Objectives' },
] as const;
export type HighlightTab = (typeof HIGHLIGHT_TABS)[number]['k'];
