import type { ApiRoleRef } from '../../auth';

/* API DTO of GET /users and GET /users/:id (backend users/user.mapper.ts; documented in OpenAPI as "User"). */
export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /* Present when the caller holds roles.view. */
  roles?: ApiRoleRef[];
}

export type UserSortField = 'createdAt' | 'name' | 'email' | 'lastLoginAt';

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: UserSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleIds?: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}
