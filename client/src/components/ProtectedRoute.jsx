import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the "who am I?" check, so a logged-in user doesn't flash the login page
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink-soft">
        Loading...
      </div>
    );
  }

  // Not logged in: go to login, and remember which page was asked for,
  // so the login page can send the user back there afterwards
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Logged in: show whichever page is nested inside this gate
  return <Outlet />;
}
