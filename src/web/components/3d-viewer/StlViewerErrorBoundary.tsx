'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this value changes the boundary resets automatically (pass the model URL). */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class StlViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Surface to console so it still shows in dev tools / Sentry if wired up.
    console.error('[StlViewer] Render error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-reset when the URL (resetKey) changes so a new file gets a fresh attempt.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return <StlViewerFallback onRetry={this.handleRetry} message={this.state.errorMessage} />;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  onRetry: () => void;
  message: string | null;
}

function StlViewerFallback({ onRetry, message }: FallbackProps) {
  const isWebGl = message?.toLowerCase().includes('webgl');

  return (
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500 rounded-lg border border-dashed border-slate-200 p-6">
      <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-slate-700">
          {isWebGl ? 'WebGL not available' : 'Unable to load 3D preview'}
        </p>
        <p className="text-xs text-slate-400 max-w-[260px]">
          {isWebGl
            ? 'Your browser or device does not support WebGL. Try a different browser.'
            : 'The file may be corrupted or in an unsupported format. You can still proceed with your order.'}
        </p>
      </div>

      {!isWebGl && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      )}
    </div>
  );
}