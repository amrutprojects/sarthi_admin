/* College Master, as /api/v1/cms/colleges returns and accepts it. */

export interface ApiCollege {
  id: string;
  name: string;
  code: string;
  /* Derived from the district on the server; a college stores no state of its own. */
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
  contactNumber: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollegeInput {
  /* Sent so the server can reject a district that does not belong to the selected state. */
  stateId?: string;
  districtId: string;
  talukaId: string | null;
  name: string;
  code: string;
  address: string | null;
  pinCode: string | null;
  contactNumber: string | null;
  email: string | null;
  isActive?: boolean;
}

export interface UpdateCollegeInput {
  stateId?: string;
  districtId?: string;
  /* Must be sent (a taluka of the new district, or null) whenever the district changes. */
  talukaId?: string | null;
  name?: string;
  code?: string;
  address?: string | null;
  pinCode?: string | null;
  contactNumber?: string | null;
  email?: string | null;
}

/* Field names of the college form, used to key validation messages (local and server). */
export const COLLEGE_FIELDS = [
  'stateId', 'districtId', 'talukaId', 'name', 'code', 'address', 'pinCode', 'contactNumber', 'email',
] as const;
export type CollegeField = (typeof COLLEGE_FIELDS)[number];
