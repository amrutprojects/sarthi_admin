import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';

/* Admin routes need a valid backend session; while an existing token is being checked, show a loader. */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="boot">
        <div className="boot-mark">A×S</div>
        <div className="boot-txt">Checking your session…</div>
        <div className="boot-bar">
          <span />
        </div>
      </div>
    );
  }
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
