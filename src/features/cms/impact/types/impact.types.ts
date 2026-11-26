/* SARTHI's Impact, as /api/v1/cms/impact returns and accepts it. */

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/** One statistic card of the section: a figure and the line under it. */
export interface ApiImpactStat {
  id: string;
  /** The figure exactly as printed, e.g. "6+", "1,000+" or "36". Entered by hand, never counted. */
  value: string;
  label: Bilingual;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiImpactSection {
  id: string;
  heading: Bilingual;
  showSection: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface ImpactStatInput {
  value?: string;
  label?: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateImpactSectionInput {
  heading: Bilingual;
  showSection: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the labels are pairs — "label.mr". */
export type ImpactField = string;
