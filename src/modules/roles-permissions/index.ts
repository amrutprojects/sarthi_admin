/* Public API of the roles-permissions module. Other modules import only from here (npm run check:boundaries). */
export { default as RolesTab } from './components/RolesTab';
export { default as PermissionsTab } from './components/PermissionsTab';
export { default as MenuVisibilityTab } from './components/MenuVisibilityTab';
export { roleKeys, useRoles } from './hooks/useRoles';
export type { ApiPermission, ApiRole } from './services/rbacApi';
