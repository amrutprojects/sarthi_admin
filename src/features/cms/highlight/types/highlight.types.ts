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
  /*
   * No isPublished, though the API still accepts it: the "Show on website" switch (PUT /cms/section-visibility/diploma)
   * is the one writer of the flag, and this save, which has no stale check, would otherwise put back an old value.
   */
}

/* Error keys are paths, because the objectives are a list — "objectives.2.text.mr". */
export type HighlightField = string;
