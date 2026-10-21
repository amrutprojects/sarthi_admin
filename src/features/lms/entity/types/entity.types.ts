/* Entity Master (AMRUT_KALASH_03 L-03 / F-LMS-03), as /api/v1/lms/entities returns and accepts it. */

/* A centre enabled for the entity. isActive is its state in the Admin Panel now (it may have been deactivated since). */
export interface EnabledCentre {
  id: string;
  name: string;
  code: string;
  districtName: string | null;
  isActive: boolean;
}

/* A technology track (T01–T12) enabled for the entity. */
export interface EnabledTrack {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

/* One kind of LMS record pointing at the entity, e.g. { label: '2 courses', count: 2, locksCode: true }. */
export interface LmsEntityReference {
  label: string;
  count: number;
  locksCode: boolean;
}

/* Only on the single-record response. */
export interface LmsEntityRelated {
  /* True once a course uses the entity: the code can no longer change (F-LMS-03-02). */
  codeLocked: boolean;
  /* Non-empty: the entity cannot be deleted. */
  references: LmsEntityReference[];
}

export interface ApiLmsEntity {
  id: string;
  name: string;
  code: string;
  description: string | null;
  defaultLanguage: string;
  timeZone: string;
  enabledCentres: EnabledCentre[];
  enabledTracks: EnabledTrack[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  related?: LmsEntityRelated;
}

/* GET /lms/entities/form-options. */
export interface LmsEntityFormOptions {
  languages: { code: string; label: string }[];
  /* false while OQ-023 (platform languages) is open: the list is To Be Confirmed. */
  languagesConfirmed: boolean;
  timeZones: string[];
  defaultTimeZone: string;
}

export interface CreateLmsEntityInput {
  name: string;
  code: string;
  description: string | null;
  defaultLanguage: string;
  timeZone: string;
  centreIds: string[];
  trackIds: string[];
  isActive?: boolean;
}

/* centreIds / trackIds replace the whole selection. Status has its own endpoint. */
export interface UpdateLmsEntityInput {
  name?: string;
  code?: string;
  description?: string | null;
  defaultLanguage?: string;
  timeZone?: string;
  centreIds?: string[];
  trackIds?: string[];
}

/* Field names of the entity form, used to key validation messages. */
export const LMS_ENTITY_FIELDS = ['name', 'code', 'description', 'defaultLanguage', 'timeZone', 'centreIds', 'trackIds'] as const;
export type LmsEntityField = (typeof LMS_ENTITY_FIELDS)[number];
