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
  /*
   * Keys of the fact table rows the home page leaves out (HIGHLIGHT_FACT_ROWS), in display order. Changed only one row
   * at a time through PATCH /cms/highlight/rows/:key; the edit form's PUT never sends it, and the server keeps it.
   */
  hiddenRows: string[];
  /*
   * The fact table rows given a name of their own, by key, both halves non-blank; a row not listed shows its default
   * name (HIGHLIGHT_FACT_ROWS). Changed one row at a time through PATCH /cms/highlight/rows/:key {label}; the edit
   * form's PUT never sends it.
   */
  rowLabels: Partial<Record<HighlightFactKey, Bilingual>>;
  createdAt: string;
  updatedAt: string;
}

/*
 * The fact table in the right-hand side of the home page's programme band, row by row in website order. `source` is
 * where the row's figure is managed; `programmeFact` is the Programme fact sheet row whose switch hides it too.
 */
export const HIGHLIGHT_FACT_ROWS = [
  { key: 'totalDuration', label: { en: 'Total duration', mr: 'एकूण कालावधी' }, source: 'Modules page', programmeFact: 'totalHours' },
  {
    key: 'idealCompletion',
    label: { en: 'Ideal completion', mr: 'आदर्श कालावधी' },
    source: 'Programme Page Management',
    programmeFact: 'idealDuration',
  },
  {
    key: 'candidatureValidity',
    label: { en: 'Candidature validity', mr: 'उमेदवारीची वैधता' },
    source: 'Programme Page Management',
    programmeFact: 'validity',
  },
  { key: 'perModule', label: { en: 'Per module', mr: 'प्रति मॉड्यूल' }, source: 'Modules page', programmeFact: null },
  { key: 'schedule', label: { en: 'Schedule', mr: 'वेळापत्रक' }, source: 'Modules page', programmeFact: null },
  {
    key: 'securityDeposit',
    label: { en: 'Security deposit', mr: 'अनामत रक्कम' },
    source: 'Programme Page Management',
    programmeFact: 'securityDeposit',
  },
  { key: 'certification', label: { en: 'Certification', mr: 'प्रमाणपत्र' }, source: 'This section — Certification', programmeFact: null },
] as const;
export type HighlightFactRow = (typeof HIGHLIGHT_FACT_ROWS)[number];
export type HighlightFactKey = HighlightFactRow['key'];

/* The name the home page shows for a fact table row now: its own name when one is set, else the default one above. */
export const factRowName = (row: HighlightFactRow, rowLabels: ApiProgrammeHighlight['rowLabels'] | undefined): Bilingual => {
  const own = rowLabels?.[row.key];
  return own && own.mr?.trim() && own.en?.trim() ? own : row.label;
};

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
