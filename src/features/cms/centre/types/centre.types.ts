/* Center Master, as /api/v1/cms/centres returns and accepts it. Not the Training Centre Master. */

/* A technology track (T01 to T12) allocated to a centre. `usable` is false once the track was deactivated after allocation. */
export interface CentreTechnology {
  code: string;
  name: string;
  usable: boolean;
}

/* An allocatable technology track (GET /cms/centres/technology-options): every active track, T01 to T12. */
export interface TechnologyOption {
  code: string;
  name: string;
}

export interface ApiCentre {
  id: string;
  name: string;
  code: string;
  /* Derived from the district on the server; a centre stores no state of its own. */
  stateId: string;
  stateName: string;
  stateCode: string;
  stateIsActive: boolean;
  districtId: string;
  districtName: string;
  districtCode: string;
  districtIsActive: boolean;
  /* The taluka is optional: all four are null when none is set. */
  talukaId: string | null;
  talukaName: string | null;
  talukaCode: string | null;
  talukaIsActive: boolean | null;
  address: string | null;
  pinCode: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  /* Ordered T01 to T12. */
  technologies: CentreTechnology[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCentreInput {
  /* Sent so the server can reject a district that does not belong to the selected state. */
  stateId?: string;
  districtId: string;
  talukaId: string | null;
  name: string;
  code: string;
  address: string | null;
  pinCode: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  /* Track codes, for example ['T03', 'T05']. */
  technologyCodes?: string[];
  isActive?: boolean;
}

export interface UpdateCentreInput {
  stateId?: string;
  districtId?: string;
  /* Must be sent (a taluka of the new district, or null) whenever the district changes. */
  talukaId?: string | null;
  name?: string;
  code?: string;
  address?: string | null;
  pinCode?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  /* When sent, replaces the whole allocation set. */
  technologyCodes?: string[];
}

/* Field names of the centre form, used to key validation messages (local and server). */
export const CENTRE_FIELDS = [
  'stateId', 'districtId', 'talukaId', 'name', 'code', 'address', 'pinCode', 'contactPerson', 'contactNumber', 'email',
  'technologyCodes',
] as const;
export type CentreField = (typeof CENTRE_FIELDS)[number];
