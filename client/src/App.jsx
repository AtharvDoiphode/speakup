import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import StyleCheck from './pages/StyleCheck';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<AuthPage />} />

      {/* Everything inside this group needs a login.
          Future pages (Conversation, Writing, etc.) go here. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>

      {/* Design test page: only exists while developing (npm run dev), never in the real build */}
      {import.meta.env.DEV && <Route path="/style" element={<StyleCheck />} />}

      {/* Any unknown URL goes home (which redirects to login if needed) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}