import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Generic error boundary that catches render-time errors in its subtree.
 * Renders a fallback UI with the error message and a reset button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            组件加载失败
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '600px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.reset}
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
    return this.props.children;
  }
}

export default ErrorBoundary;
