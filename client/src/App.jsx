import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import WakeBanner from './components/WakeBanner';
import AuthPage from './pages/AuthPage';

// Each page's code loads when it's first opened (AppShell shows a skeleton meanwhile).
// The login page stays in the main bundle: it's the first thing a new visitor sees.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WritingPage = lazy(() => import('./pages/WritingPage'));
const WritingResultPage = lazy(() => import('./pages/WritingResultPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const ReadAloudPage = lazy(() => import('./pages/ReadAloudPage'));
const GrammarPage = lazy(() => import('./pages/GrammarPage'));
const GrammarMinePage = lazy(() => import('./pages/GrammarMinePage'));
const GrammarLessonPage = lazy(() => import('./pages/GrammarLessonPage'));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage'));
const VocabReviewPage = lazy(() => import('./pages/VocabReviewPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const TranscriptPage = lazy(() => import('./pages/TranscriptPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FamilyPage = lazy(() => import('./pages/FamilyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <WakeBanner />
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
            <Route path="settings" element={<SettingsPage />} />
            <Route path="family" element={<FamilyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
