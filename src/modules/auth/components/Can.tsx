import type { ReactNode } from 'react';
import { useAuth } from '../auth-context';
import { canDo, canOpen, type Action } from '../permissions';

/* True when the signed-in user may perform the action (backend permission codes). */
export function useCan(): (action: Action) => boolean {
  const { permissions } = useAuth();
  return (action) => canDo(permissions, action);
}

/* True when the signed-in user may open the screen behind a sidebar key. */
export function useCanOpen(): (navKey: string) => boolean {
  const { permissions, hiddenMenus } = useAuth();
  return (navKey) => canOpen(permissions, navKey, hiddenMenus);
}

/* Renders children only when the user may perform the action. */
export function Can({ action, children }: { action: Action; children: ReactNode }) {
  return useCan()(action) ? <>{children}</> : null;
}
