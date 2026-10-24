/* The Top Bar, as /api/v1/cms/top-bar returns and accepts it. */

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/** One link button of the strip at the very top of the website ("Verify Certificate"). */
export interface ApiTopBarLink {
  id: string;
  /** The text on the button, in both languages. */
  label: Bilingual;
  /** A page of the public site ("/verify"), or an http(s) address — never blank. */
  link: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTopBarSettings {
  id: string;
  /** The bold text at the left of the strip ("Government of Maharashtra"); null (or blank) when it is not shown. */
  governmentName: Bilingual | null;
  /** Whether the website shows the Marathi / English language switch. */
  showLanguageToggle: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface TopBarLinkInput {
  label?: Bilingual;
  link?: string;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateTopBarSettingsInput {
  /** Blank in both languages leaves the bold text out. */
  governmentName: Bilingual;
  showLanguageToggle: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "label.mr". */
export type TopBarField = string;
