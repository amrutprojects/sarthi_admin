/* The SARTHI Ecosystem, as /api/v1/cms/ecosystem returns and accepts it. */

/** A Marathi/English pair. An optional pair is { mr: '', en: '' } when blank. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiProgramme {
  id: string;
  name: Bilingual;
  description: Bilingual;
  /** One of ECOSYSTEM_ICONS. */
  icon: string;
  /** A page of the public site ("/programme"), an http(s) address, or null for no destination. */
  link: string | null;
  /** The card's own link label; blank means the section's default label is used. */
  linkLabel: Bilingual;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEcosystemSection {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  /** The label printed on every card that has none of its own, e.g. "अधिक जाणून घ्या →". */
  linkLabel: Bilingual;
  showSection: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface ProgrammeInput {
  name?: Bilingual;
  description?: Bilingual;
  icon?: string;
  link?: string | null;
  linkLabel?: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateEcosystemSectionInput {
  heading: Bilingual;
  subtitle: Bilingual;
  linkLabel: Bilingual;
  showSection: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "name.mr". */
export type EcosystemField = string;
