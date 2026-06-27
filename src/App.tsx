import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from '@/components/layout';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useUIStore } from '@/stores/uiStore';
import { Spinner } from '@/components/ui';

const ChatPage = lazy(() => import('@/pages/ChatPage'));
const AgentsPage = lazy(() => import('@/pages/AgentsPage'));
const OrchestrationPage = lazy(() => import('@/pages/OrchestrationPage'));
const ObservePage = lazy(() => import('@/pages/ObservePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  useKeyboard();
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // Sync activeTab with the route on navigation
  useEffect(() => {
    const handler = () => {
      const path = window.location.pathname;
      const tab = path.split('/')[1] ?? 'chat';
      setActiveTab(tab);
    };
    handler();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [setActiveTab]);

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route
          path="/chat"
          element={
            <Suspense fallback={<PageFallback />}>
              <ChatPage />
            </Suspense>
          }
        />
        <Route
          path="/agents"
          element={
            <Suspense fallback={<PageFallback />}>
              <AgentsPage />
            </Suspense>
          }
        />
        <Route
          path="/agents/:agentId"
          element={
            <Suspense fallback={<PageFallback />}>
              <AgentsPage />
            </Suspense>
          }
        />
        <Route
          path="/orchestration"
          element={
            <Suspense fallback={<PageFallback />}>
              <OrchestrationPage />
            </Suspense>
          }
        />
        <Route
          path="/observe"
          element={
            <Suspense fallback={<PageFallback />}>
              <ObservePage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
