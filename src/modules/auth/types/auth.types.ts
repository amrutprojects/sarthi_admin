export interface ApiRoleRef {
  id: string;
  name: string;
  code: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: ApiRoleRef[];
}

/* GET /auth/me: the signed-in user with roles and effective permission codes. */
export interface CurrentUser extends ApiUser {
  roles: ApiRoleRef[];
  permissions: string[];
  /* Menus hidden from this user by the per-role Menu Visibility settings. */
  hiddenMenus?: string[];
  /*
   * 'website' for a Website Admin (CMS menu only); 'ipp' for an IPP officer: Divisional Officer, COEP or Head Officer
   * (IPP Approvals' Applications only); 'admin' (the default) for the full panel.
   */
  portal?: 'admin' | 'website' | 'ipp';
}
