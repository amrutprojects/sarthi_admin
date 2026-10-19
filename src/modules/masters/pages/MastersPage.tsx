import { Navigate } from 'react-router-dom';
import { Callout } from '../../../components/ui';
import { useAuth } from '../../auth';
import { MASTERS, masterPermission } from '../config';

/* /masters (old link): opens the first master the user may view; each master has its own sidebar item and page. */
export default function MastersPage() {
  const { permissions } = useAuth();
  const first = MASTERS.find((m) => permissions.has(masterPermission(m, 'view')));
  if (first) return <Navigate to={`/masters/${first.path}`} replace />;
  return (
    <div className="page">
      <Callout tone="warn" title="Not permitted. ">
        You do not have permission to view any master.
      </Callout>
    </div>
  );
}
