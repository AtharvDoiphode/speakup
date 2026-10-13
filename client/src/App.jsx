import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import PracticePage from './pages/PracticePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      {/* ProtectedRoute checks the login and renders an <Outlet />,
          so the shell sits one level inside it as its own layout route. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="practice/:id" element={<ComingSoon title="Live conversation" />} />
          <Route path="writing" element={<ComingSoon title="Writing" />} />
          <Route path="read-aloud" element={<ComingSoon title="Read Aloud" />} />
          <Route path="grammar" element={<ComingSoon title="Grammar" />} />
          <Route path="vocabulary" element={<ComingSoon title="Vocabulary" />} />
          <Route path="progress" element={<ComingSoon title="Progress" />} />
          <Route path="history" element={<ComingSoon title="History" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}