/* Advisory Committee Management, as /api/v1/cms/advisory-committee returns and accepts it. */

/** A Marathi/English pair. Optional texts come back as { mr: '', en: '' } when blank. */
export interface Bilingual {
  mr: string;
  en: string;
}

/** A bulleted list per language, as the server normalised it (trimmed, no bullet markers, no blank items). [] when blank. */
export interface BilingualList {
  mr: string[];
  en: string[];
}

/** The five bulleted lists of an Advisory Committee member's profile ("View Profile" on the website), in the order the form shows them. */
export const PROFILE_LISTS = ['administrativeRoles', 'keyAchievements', 'majorContributions', 'researchLeadership', 'education'] as const;
export type ProfileListKey = (typeof PROFILE_LISTS)[number];

/** One Advisory Committee member, hidden ones included (the admin list). */
export interface ApiAdvisoryMember {
  id: string;
  name: Bilingual;
  /** The position printed under the name, e.g. "Vice Chancellor, COEP Technological University, Pune". */
  designation: Bilingual;
  /**
   * The profile, shown when a visitor opens "View Profile". Unlike the name and position, each part may be filled
   * in one language only: the website shows the visitor's language, or the other one when that is blank.
   */
  experience: Bilingual;
  administrativeRoles: BilingualList;
  keyAchievements: BilingualList;
  majorContributions: BilingualList;
  researchLeadership: BilingualList;
  education: BilingualList;
  /** Relative to the API base URL and needs the session; null when the website shows the person icon. */
  photoUrl: string | null;
  /** The group heading the Advisory Committee member is listed under on the website; null = no group (listed first, without a heading). */
  groupId: string | null;
  group: { id: string; name: Bilingual } | null;
  displayOrder: number;
  /** true = shown on the website. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A heading the Advisory Committee members are listed under on the website, e.g. the organisation they belong to. Hidden groups
 * included (the admin list).
 */
export interface ApiAdvisoryGroup {
  id: string;
  name: Bilingual;
  displayOrder: number;
  /** true = shown on the website; a hidden group hides its heading AND its Advisory Committee members. */
  isActive: boolean;
  /** The Advisory Committee members in the group, hidden ones included. */
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The group create body (a new group goes to the end); on update every key is optional. */
export interface AdvisoryGroupInput {
  name?: Bilingual;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

/** The heading and subtitle above the Advisory Committee members on the website's Advisory Committee page. */
export interface ApiAdvisorySection {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface AdvisoryMemberInput {
  name?: Bilingual;
  designation?: Bilingual;
  experience?: Bilingual;
  /** The lists as arrays of items; the server trims them, strips bullet markers and drops blank items again. */
  administrativeRoles?: BilingualList;
  keyAchievements?: BilingualList;
  majorContributions?: BilingualList;
  researchLeadership?: BilingualList;
  education?: BilingualList;
  /** An existing group's id, or null for no group. */
  groupId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: clear the current photo. */
  removePhoto?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

export interface UpdateAdvisorySectionInput {
  heading: Bilingual;
  subtitle: Bilingual;
  /** The updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt: string;
}

/* Error keys are paths, because the texts are pairs — "designation.mr", "keyAchievements.en". */
export type AdvisoryField = string;
