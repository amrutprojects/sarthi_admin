import type { ReactNode } from 'react';
import type { NavItem } from '../../../constants/navigation';
import { useAuth } from '../auth-context';
import { homeItem } from '../home';
import { canDo, canOpen, type Action } from '../permissions';

/* True when the signed-in user may perform the action (backend permission codes). */
export function useCan(): (action: Action) => boolean {
  const { permissions } = useAuth();
  return (action) => canDo(permissions, action);
}

/* True when the signed-in user may open the screen behind a sidebar key. */
export function useCanOpen(): (navKey: string) => boolean {
  const { permissions, hiddenMenus, portal } = useAuth();
  return (navKey) => canOpen(permissions, navKey, hiddenMenus, portal);
}

/* The signed-in user's start screen (see home.ts). */
export function useHome(): NavItem {
  const { permissions, hiddenMenus, portal } = useAuth();
  return homeItem({ permissions, hiddenMenus, portal });
}

/* Renders children only when the user may perform the action. */
export function Can({ action, children }: { action: Action; children: ReactNode }) {
  return useCan()(action) ? <>{children}</> : null;
}
