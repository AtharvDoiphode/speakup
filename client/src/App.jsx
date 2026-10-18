import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import WritingPage from './pages/WritingPage';
import WritingResultPage from './pages/WritingResultPage';
import PracticePage from './pages/PracticePage';
import LivePage from './pages/LivePage';
import ReadAloudPage from './pages/ReadAloudPage';
import GrammarPage from './pages/GrammarPage';
import GrammarMinePage from './pages/GrammarMinePage';
import GrammarLessonPage from './pages/GrammarLessonPage';
import VocabularyPage from './pages/VocabularyPage';
import VocabReviewPage from './pages/VocabReviewPage';
import ProgressPage from './pages/ProgressPage';
import HistoryPage from './pages/HistoryPage';
import TranscriptPage from './pages/TranscriptPage';

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
          <Route path="practice/:id" element={<LivePage />} />
          <Route path="writing" element={<WritingPage />} />
          <Route path="writing/:id" element={<WritingResultPage />} />
          <Route path="read-aloud" element={<ReadAloudPage />} />
          <Route path="grammar" element={<GrammarPage />} />
          {/* "mine" before ":type", so it isn't read as a lesson called "mine" */}
          <Route path="grammar/mine" element={<GrammarMinePage />} />
          <Route path="grammar/:type" element={<GrammarLessonPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="vocabulary/review" element={<VocabReviewPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<TranscriptPage />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}