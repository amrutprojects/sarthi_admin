/* Department Master, as /api/v1/cms/departments returns and accepts it. */

export interface ApiDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string | null;
}

/* Field names of the department form, used to key validation messages. */
export const DEPARTMENT_FIELDS = ['name', 'code', 'description'] as const;
export type DepartmentField = (typeof DEPARTMENT_FIELDS)[number];
