/* API DTO of the master endpoints (backend MasterService.toDto). */
export interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isMandatory?: boolean;
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
}

export type MasterSortField = 'createdAt' | 'updatedAt' | 'code' | 'name';

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
}
