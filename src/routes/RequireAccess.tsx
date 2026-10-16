import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { canOpen } from '../auth/permissions';
import { EmptyState, LinkButton } from '../components/ui';

/* Shows the page only when the signed-in user may open it; otherwise an access notice. */
export default function RequireAccess({ navKey, children }: { navKey: string; children: ReactNode }) {
  const { permissions, hiddenMenus, primaryRole } = useAuth();
  if (canOpen(permissions, navKey, hiddenMenus)) return <>{children}</>;
  return (
    <div className="page">
      <EmptyState
        title="You don't have access to this screen"
        msg={'Your role (' + (primaryRole ? primaryRole.name : 'none') + ') does not include permission for this module, or the menu is hidden for your role. Ask an administrator if you need it.'}
      >
        <LinkButton to="#/dashboard" className="btn primary">Go to Dashboard</LinkButton>
      </EmptyState>
    </div>
  );
}
