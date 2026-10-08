import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Wait for the "who am I?" check, so a logged-in user doesn't flash the login page
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cloud text-ink-soft">
        Loading...
      </div>
    );
  }

  // Not logged in: go to login
  if (!user) return <Navigate to="/login" replace />;

  // Logged in: show whichever page is nested inside this gate
  return <Outlet />;
}
