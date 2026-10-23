/* Board Members Management, as /api/v1/cms/board-members returns and accepts it. */

/** A Marathi/English pair. Optional texts come back as { mr: '', en: '' } when blank. */
export interface Bilingual {
  mr: string;
  en: string;
}

export interface ApiBoardMember {
  id: string;
  /** null while the officeholder's name is still to be supplied; the website prints its placeholder. */
  name: string | null;
  /** The badge above the name, e.g. "राज्य शासन" / "State Government". */
  category: Bilingual;
  designation: Bilingual;
  description: Bilingual;
  subtitle: Bilingual;
  /** Relative to the API base URL and needs the session; null when the card shows the person icon. */
  photoUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBoardSection {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  noticeTitle: Bilingual;
  noticeBody: Bilingual;
  showNotice: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface BoardMemberInput {
  name?: string | null;
  category?: Bilingual;
  designation?: Bilingual;
  description?: Bilingual;
  subtitle?: Bilingual;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: clear the current photo. */
  removePhoto?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateBoardSectionInput {
  heading: Bilingual;
  subtitle: Bilingual;
  noticeTitle: Bilingual;
  noticeBody: Bilingual;
  showNotice: boolean;
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "category.mr". */
export type BoardField = string;
