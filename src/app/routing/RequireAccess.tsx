import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/auth-context';
import { useHome } from '../../modules/auth/components/Can';
import { canOpen } from '../../modules/auth/permissions';
import { EmptyState, LinkButton } from '../../components/ui';

/*
 * Shows the page only when the signed-in user may open it; otherwise an access notice. The Dashboard is where
 * every "home" link points, so a user who cannot open it (a Website Admin) is taken to their own start screen.
 */
export default function RequireAccess({ navKey, children }: { navKey: string; children: ReactNode }) {
  const { permissions, hiddenMenus, primaryRole, portal } = useAuth();
  const home = useHome();
  if (canOpen(permissions, navKey, hiddenMenus, portal)) return <>{children}</>;
  if (navKey === 'dashboard' && home.k !== 'dashboard') return <Navigate to={home.r} replace />;
  return (
    <div className="page">
      <EmptyState
        title="You don't have access to this screen"
        msg={
          'Your role (' +
          (primaryRole ? primaryRole.name : 'none') +
          ') does not include permission for this module, or the menu is hidden for your role. Ask an administrator if you need it.'
        }
      >
        <LinkButton to={'#' + home.r} className="btn primary">
          {'Go to ' + home.l}
        </LinkButton>
      </EmptyState>
    </div>
  );
}
