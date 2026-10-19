/* Public API of the auth module. Other modules import only from here (npm run check:boundaries). */
export { AuthProvider, SESSION_QUERY_KEY, useAuth, type AuthStatus, type AuthValue } from './AuthContext';
export { Can, useCan, useCanOpen } from './components/Can';
export {
  ACTION_ACCESS,
  MENU_ACTIONS,
  MENU_ACTION_LABEL,
  SCREEN_ACCESS,
  canDo,
  canOpen,
  hasAny,
  type Action,
  type MenuAction,
} from './permissions';
export type { ApiRoleRef, ApiUser, CurrentUser } from './types/auth.types';
