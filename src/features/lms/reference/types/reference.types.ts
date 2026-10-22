/*
 * Reference Data (UI-314) as the backend returns it (GET /api/v1/lms/reference/*).
 *
 * Districts, training centres and technology tracks are owned by the Admin Panel and read live by the LMS Admin
 * (same database). Nothing here is editable. `sourceUpdatedAt` is the time the Admin Panel last changed the record.
 */

export type ReferenceDataset = 'districts' | 'centres' | 'tracks';

export interface ApiReferenceDistrict {
  id: string;
  code: string;
  name: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  stateIsActive: boolean;
  isActive: boolean;
  sourceUpdatedAt: string;
}

/*
 * A training centre with the Training Centre Profile fields the Admin Panel records: capacity and computer systems
 * come from the centre's capacity & infrastructure record and are null when the Admin Panel has none.
 */
export interface ApiReferenceCentre {
  id: string;
  code: string;
  name: string;
  districtId: string;
  districtName: string;
  districtCode: string;
  districtIsActive: boolean;
  stateName: string;
  centreTypeName: string | null;
  talukaName: string | null;
  maxSeatingCapacity: number | null;
  computerSystems: number | null;
  isActive: boolean;
  sourceUpdatedAt: string;
}

export interface ApiReferenceTrack {
  id: string;
  code: string;
  name: string;
  /* Names the external registration form uses for the track. */
  aliases: string[];
  sortOrder: number;
  isActive: boolean;
  sourceUpdatedAt: string;
}

export interface ReferenceDatasetSummary {
  total: number;
  active: number;
  inactive: number;
  /* null while the Admin Panel table holds no row at all. */
  sourceUpdatedAt: string | null;
}

export interface ReferenceSummary {
  districts: ReferenceDatasetSummary;
  centres: ReferenceDatasetSummary;
  tracks: ReferenceDatasetSummary;
  sync: { mode: 'LIVE'; source: string };
}
