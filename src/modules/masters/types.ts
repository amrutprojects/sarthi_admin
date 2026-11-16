/* API DTO of the master endpoints (backend MasterService.toDto). */
export interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isMandatory?: boolean;
  /* Castes only. */
  nameEn?: string | null;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* GET /<master>/options: active, non-deleted values for dropdowns. */
export interface MasterOption {
  id: string;
  code: string;
  name: string;
  isMandatory?: boolean;
  /* Castes only: the English name, or null. Castes come in display order. */
  nameEn?: string | null;
}

/* displayOrder: ordered masters (castes) only. */
export type MasterSortField = 'createdAt' | 'updatedAt' | 'code' | 'name' | 'displayOrder';

export interface MasterListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: MasterSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface MasterInput {
  code?: string;
  name?: string;
  description?: string | null;
  isMandatory?: boolean;
  nameEn?: string | null;
  displayOrder?: number;
}
