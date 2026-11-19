/* Apply Page Management, as /api/v1/cms/apply returns and accepts it. */

export interface Bilingual {
  mr: string;
  en: string;
}

/*
 * The two lists on the public Apply ("How to Apply") page. A STEP is one rung of the numbered
 * application ladder — a title and its description, numbered by position on the website; a FACT is a
 * label / value row of the "For Your Information" card ("Security deposit" — "₹2,000 (refundable)"). The
 * "Documents to keep ready" list is not stored here: it is the Eligibility page's required documents.
 */
export type ApplyKind = 'STEP' | 'FACT';

export const APPLY_KINDS: readonly ApplyKind[] = ['STEP', 'FACT'];

/* The Type tag on the listing. */
export const KIND_LABEL: Record<ApplyKind, string> = {
  STEP: 'Step',
  FACT: 'For Your Information',
};

/* What one item is called in titles, toasts and confirmations ("Information row deleted"). */
export const ITEM_NAME: Record<ApplyKind, string> = {
  STEP: 'Step',
  FACT: 'Information row',
};

export interface ApiApplyItem {
  id: string;
  kind: ApplyKind;
  /* A step's title or a fact's label. */
  label: Bilingual;
  /* A step's description or a fact's value: both kinds carry one. */
  value: Bilingual;
  /* Position within its own list on the public page, lowest first. */
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplyItemInput {
  kind: ApplyKind;
  label: Bilingual;
  value: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
}

/* The type is not editable: an item that belongs in the other list is deleted and added again there. */
export interface UpdateApplyItemInput {
  label?: Bilingual;
  value?: Bilingual;
  displayOrder?: number;
}

/* Field names of the item form, as the API reports them in 422 details ("body.label.mr"). */
export const APPLY_ITEM_FIELDS = ['kind', 'label.mr', 'label.en', 'value.mr', 'value.en', 'displayOrder'] as const;
export type ApplyItemField = (typeof APPLY_ITEM_FIELDS)[number];

/* The page text around the two lists, and the Apply box: one row, edited as a whole. */
export interface ApiApplySettings {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  noteTitle: Bilingual;
  noteBody: Bilingual;
  glanceHeading: Bilingual;
  documentsHeading: Bilingual;
  ctaText: Bilingual;
  ctaLabel: Bilingual;
  /* The official portal page the Apply button opens; one link for both languages. */
  ctaUrl: string;
  ctaHint: Bilingual;
  createdAt: string;
  updatedAt: string;
}

/* The bilingual pairs of the page text, in the order the public page shows them. ctaUrl is separate: it is a single link. */
export const SETTINGS_KEYS = [
  'pageTitle',
  'pageSubtitle',
  'noteTitle',
  'noteBody',
  'glanceHeading',
  'documentsHeading',
  'ctaText',
  'ctaLabel',
  'ctaHint',
] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/* Every field is required, so the update always sends all of them. */
export type UpdateApplySettingsInput = Record<SettingsKey, Bilingual> & { ctaUrl: string };

export const SETTINGS_LABEL: Record<SettingsKey, string> = {
  pageTitle: 'Page title',
  pageSubtitle: 'Page subtitle',
  noteTitle: 'Note title',
  noteBody: 'Note text',
  glanceHeading: 'For Your Information heading',
  documentsHeading: 'Documents heading',
  ctaText: 'Apply box text',
  ctaLabel: 'Apply button label',
  ctaHint: 'Apply button hint',
};

export const CTA_URL_LABEL = 'Portal link';

/*
 * The page text, grouped by where each piece appears on the public Apply page, in reading order. The
 * Page text tab and the page-text form both show it this way, so a field is easy to find from the page.
 */
export const SETTINGS_GROUPS: { title: string; sub: string; keys: readonly (SettingsKey | 'ctaUrl')[] }[] = [
  { title: 'Page heading', sub: 'the banner at the top of the page', keys: ['pageTitle', 'pageSubtitle'] },
  { title: 'Important note', sub: 'the box under the application steps', keys: ['noteTitle', 'noteBody'] },
  { title: 'Apply box', sub: 'the card with the Apply button', keys: ['ctaText', 'ctaLabel', 'ctaUrl', 'ctaHint'] },
  { title: 'Card headings', sub: 'the titles of the two cards on the right', keys: ['glanceHeading', 'documentsHeading'] },
];

/*
 * The four tabs of Apply Page Management, one per section of the public Apply page. The active tab is
 * kept in the URL (?tab=), so Back from a step, a row or the page-text form returns to the tab it came from.
 */
export const APPLY_TABS = [
  { k: 'page', l: 'Page text' },
  { k: 'steps', l: 'Application steps' },
  { k: 'facts', l: 'For Your Information' },
  { k: 'documents', l: 'Documents to keep ready' },
] as const;
export type ApplyTab = (typeof APPLY_TABS)[number]['k'];

export const isApplyTab = (v: string | null): v is ApplyTab => APPLY_TABS.some((t) => t.k === v);

/* The tab each kind of item is listed on. */
export const KIND_TAB: Record<ApplyKind, ApplyTab> = { STEP: 'steps', FACT: 'facts' };

/* The listing, opened on one tab. */
export const applyListPath = (tab: ApplyTab): string => `/cms/apply?tab=${tab}`;

/* Field names of the page-text form, as the API reports them in 422 details ("body.pageTitle.mr", "body.ctaUrl"). */
export const APPLY_SETTINGS_FIELDS = [
  'pageTitle.mr',
  'pageTitle.en',
  'pageSubtitle.mr',
  'pageSubtitle.en',
  'noteTitle.mr',
  'noteTitle.en',
  'noteBody.mr',
  'noteBody.en',
  'glanceHeading.mr',
  'glanceHeading.en',
  'documentsHeading.mr',
  'documentsHeading.en',
  'ctaText.mr',
  'ctaText.en',
  'ctaLabel.mr',
  'ctaLabel.en',
  'ctaUrl',
  'ctaHint.mr',
  'ctaHint.en',
] as const;
export type ApplySettingsField = (typeof APPLY_SETTINGS_FIELDS)[number];
