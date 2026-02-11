'use client';

import { ReactNode, Component, ErrorInfo } from 'react';

class StaffErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send error to server for debugging
    fetch('/api/staff/debug-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Помилка завантаження</h2>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            {this.state.error?.message}
          </p>
          <pre style={{ 
            fontSize: 11, color: '#999', textAlign: 'left', 
            overflow: 'auto', maxHeight: 200, padding: 12,
            background: '#f5f5f5', borderRadius: 8 
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 16, padding: '10px 24px', borderRadius: 12,
              background: '#000', color: '#fff', border: 'none', fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Перезавантажити
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ viewTransitionName: 'page' }}>
      <StaffErrorBoundary>
        {children}
      </StaffErrorBoundary>
    </div>
  );
}
