/* Eligibility Page Management, as /api/v1/cms/eligibility returns and accepts it. */

export interface Bilingual {
  mr: string;
  en: string;
}

/*
 * The two lists on the public Eligibility page. A CRITERION is a label / value row of the criteria card
 * ("Age" — "18 to 45 years"); a DOCUMENT is one line of the required-documents checklist and has no value.
 */
export type EligibilityKind = 'CRITERION' | 'DOCUMENT';

export const ELIGIBILITY_KINDS: readonly EligibilityKind[] = ['CRITERION', 'DOCUMENT'];

export const KIND_LABEL: Record<EligibilityKind, string> = {
  CRITERION: 'Criterion',
  DOCUMENT: 'Document',
};

export interface ApiEligibilityItem {
  id: string;
  kind: EligibilityKind;
  label: Bilingual;
  /* A criterion's value; always null for a document. */
  value: Bilingual | null;
  /* Position within its own list on the public page, lowest first. */
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEligibilityItemInput {
  kind: EligibilityKind;
  label: Bilingual;
  /* Required for a criterion; a document must not carry one. */
  value?: Bilingual | null;
  displayOrder?: number;
  isActive?: boolean;
}

/* The type is not editable: an item that belongs in the other list is deleted and added again there. */
export interface UpdateEligibilityItemInput {
  label?: Bilingual;
  value?: Bilingual | null;
  displayOrder?: number;
}

/*
 * The three tabs of Eligibility Page Management: the page text and the two lists. The active tab is kept in
 * the URL (?tab=), as on Modules Page Management, so Back from an item or the page-text form returns to it.
 */
export const ELIGIBILITY_TABS = [
  { k: 'page', l: 'Page text' },
  { k: 'criteria', l: 'Eligibility criteria' },
  { k: 'documents', l: 'Required documents' },
] as const;
export type EligibilityTab = (typeof ELIGIBILITY_TABS)[number]['k'];

/* The tab each kind of item is listed on. */
export const KIND_TAB: Record<EligibilityKind, EligibilityTab> = { CRITERION: 'criteria', DOCUMENT: 'documents' };

/* The listing, opened on one tab. */
export const eligibilityListPath = (tab: EligibilityTab): string => `/cms/eligibility?tab=${tab}`;

/* Field names of the item form, as the API reports them in 422 details ("body.label.mr"). */
export const ELIGIBILITY_ITEM_FIELDS = ['kind', 'label.mr', 'label.en', 'value.mr', 'value.en', 'displayOrder'] as const;
export type EligibilityItemField = (typeof ELIGIBILITY_ITEM_FIELDS)[number];

/* The page text around the two lists: one row, edited as a whole. */
export interface ApiEligibilitySettings {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  criteriaHeading: Bilingual;
  documentsHeading: Bilingual;
  noteTitle: Bilingual;
  noteBody: Bilingual;
  createdAt: string;
  updatedAt: string;
}

export const SETTINGS_KEYS = ['pageTitle', 'pageSubtitle', 'criteriaHeading', 'documentsHeading', 'noteTitle', 'noteBody'] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/* Every pair is required, so the update always sends all six. */
export type UpdateEligibilitySettingsInput = Record<SettingsKey, Bilingual>;

export const SETTINGS_LABEL: Record<SettingsKey, string> = {
  pageTitle: 'Page title',
  pageSubtitle: 'Page subtitle',
  criteriaHeading: 'Criteria heading',
  documentsHeading: 'Documents heading',
  noteTitle: 'Note title',
  noteBody: 'Note text',
};

/* Field names of the page-text form, as the API reports them in 422 details ("body.pageTitle.mr"). */
export const ELIGIBILITY_SETTINGS_FIELDS = [
  'pageTitle.mr',
  'pageTitle.en',
  'pageSubtitle.mr',
  'pageSubtitle.en',
  'criteriaHeading.mr',
  'criteriaHeading.en',
  'documentsHeading.mr',
  'documentsHeading.en',
  'noteTitle.mr',
  'noteTitle.en',
  'noteBody.mr',
  'noteBody.en',
] as const;
export type EligibilitySettingsField = (typeof ELIGIBILITY_SETTINGS_FIELDS)[number];
