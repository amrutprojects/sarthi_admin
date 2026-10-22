/* Public API of the auth module. Other modules import only from here (npm run check:boundaries). */
export { AuthProvider } from './AuthContext';
export { SESSION_QUERY_KEY, useAuth, type AuthStatus, type AuthValue } from './auth-context';
export { Can, useCan, useCanOpen, useHome } from './components/Can';
export { canOpenPath, homeItem, homePath } from './home';
export {
  ACTION_ACCESS,
  MENU_ACTIONS,
  MENU_ACTION_LABEL,
  SCREEN_ACCESS,
  WEBSITE_ADMIN_ROLE,
  WEBSITE_MENUS,
  canDo,
  canOpen,
  hasAny,
  type Action,
  type MenuAction,
  type Portal,
} from './permissions';
export type { ApiRoleRef, ApiUser, CurrentUser } from './types/auth.types';
