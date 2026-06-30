import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/layout';
import './styles/global.css';

function RootErrorFallback(error: Error, reset: () => void) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-background)',
        color: 'var(--text-foreground)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
        应用加载失败
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          textAlign: 'center',
          wordBreak: 'break-word',
        }}
      >
        {error.message}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '6px 16px',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          background: 'var(--bg-card)',
          color: 'var(--text-foreground)',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        重试
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={RootErrorFallback}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
