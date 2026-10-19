/* District Master, as /api/v1/cms/districts returns and accepts it. */

export interface ApiDistrict {
  id: string;
  name: string;
  code: string;
  stateId: string;
  stateName: string;
  stateCode: string;
  /* False when the parent state has been deactivated: the district must be re-pointed before saving. */
  stateIsActive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /* Only on the single-record response. */
  talukaCount?: number;
}

export interface CreateDistrictInput {
  stateId: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UpdateDistrictInput {
  stateId?: string;
  name?: string;
  code?: string;
}

export const DISTRICT_FIELDS = ['stateId', 'name', 'code'] as const;
export type DistrictField = (typeof DISTRICT_FIELDS)[number];
