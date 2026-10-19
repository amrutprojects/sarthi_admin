/* Taluka Master, as /api/v1/cms/talukas returns and accepts it. */

export interface ApiTaluka {
  id: string;
  name: string;
  /* Optional: taluka code lists are often unavailable. */
  code: string | null;
  districtId: string;
  districtName: string;
  districtCode: string;
  districtIsActive: boolean;
  /* Derived from the district on the server; a taluka stores no state of its own. */
  stateId: string;
  stateName: string;
  stateCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTalukaInput {
  /* Sent so the server can reject a district that does not belong to the selected state. */
  stateId?: string;
  districtId: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

export interface UpdateTalukaInput {
  stateId?: string;
  districtId?: string;
  name?: string;
  code?: string | null;
}

export const TALUKA_FIELDS = ['stateId', 'districtId', 'name', 'code'] as const;
export type TalukaField = (typeof TALUKA_FIELDS)[number];
