/* SARTHI Schemes, as /api/v1/cms/schemes returns and accepts it. */

/** A Marathi/English pair. An optional pair is { mr: '', en: '' } when blank. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiScheme {
  id: string;
  title: Bilingual;
  description: Bilingual;
  /** The tag above the title ("हा कार्यक्रम" / "This programme"); blank for none. */
  badge: Bilingual;
  /** The last date as a calendar day, "2027-03-31"; null when the scheme has none. */
  deadline: string | null;
  /** A page of the public site ("/programme"), an http(s) address, or null for no destination. */
  link: string | null;
  /** The scheme's own button label; blank means the section's default label is used. */
  buttonLabel: Bilingual;
  /** The highlighted (saffron) card style. */
  featured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSchemesSection {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  /** The label printed on every card's button that has none of its own, e.g. "अधिक जाणून घ्या". */
  buttonLabel: Bilingual;
  showSection: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface SchemeInput {
  title?: Bilingual;
  description?: Bilingual;
  badge?: Bilingual;
  deadline?: string | null;
  link?: string | null;
  buttonLabel?: Bilingual;
  featured?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateSchemesSectionInput {
  heading: Bilingual;
  subtitle: Bilingual;
  buttonLabel: Bilingual;
  showSection: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "title.mr". */
export type SchemesField = string;
