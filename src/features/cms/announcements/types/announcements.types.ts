/* Announcements, as /api/v1/cms/announcements returns and accepts them. */

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiAnnouncement {
  id: string;
  title: Bilingual;
  /** The line after the title in the ticker ("title — detail"); null for none. */
  detail: Bilingual | null;
  /** A page of the public site ("/apply"), an http(s) address, or null when the item is plain text. */
  link: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAnnouncementsSection {
  id: string;
  /** The small pill at the start of the ticker, e.g. "सूचना" / "Announcements". */
  label: Bilingual;
  /** Whether the website shows the ticker at all. */
  showSection: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface AnnouncementInput {
  title?: Bilingual;
  detail?: Bilingual | null;
  link?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateAnnouncementsSectionInput {
  label: Bilingual;
  showSection: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "title.mr". */
export type AnnouncementsField = string;
