/* About SARTHI Management, as /api/v1/cms/about returns and accepts it. */

/** A Marathi/English pair. The subtitle is { mr: '', en: '' } when there is none. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiAboutSection {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  /** Plain text; line breaks separate paragraphs. */
  description: Bilingual;
  showSection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAboutFact {
  id: string;
  label: Bilingual;
  value: Bilingual;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAboutCard {
  id: string;
  heading: Bilingual;
  description: Bilingual;
  displayOrder: number;
  isActive: boolean;
  /** One of the original Mission / Vision / Values cards: editable, never deleted or hidden. */
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAbout {
  section: ApiAboutSection;
  facts: ApiAboutFact[];
  cards: ApiAboutCard[];
}

/** A partial update of the section: only the keys sent change. */
export interface UpdateAboutSectionInput {
  heading?: Bilingual;
  subtitle?: Bilingual;
  description?: Bilingual;
  showSection?: boolean;
  expectedUpdatedAt: string;
}

/** The two kinds of list the module manages. */
export type AboutKind = 'facts' | 'cards';

/** A row or a card as the shared form edits it: `first` is the label / heading, `second` the value / description. */
export interface AboutItem {
  id: string;
  first: Bilingual;
  second: Bilingual;
  displayOrder: number;
  isActive: boolean;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "heading.mr". */
export type AboutField = string;
