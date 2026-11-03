import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import { Skeleton } from './ui';

const HOME = { seeker: '/jobs', recruiter: '/recruiter', admin: '/admin' };

/** Renders child routes only for logged-in users with one of `roles`; otherwise redirects. */
export function ProtectedRoute({ roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Skeleton rows={3} />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME[user.role] || '/'} replace />;
  return <Outlet />;
}

export const homeFor = (role) => HOME[role] || '/';
