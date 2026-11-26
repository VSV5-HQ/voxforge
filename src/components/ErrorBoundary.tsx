import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(displayMessage) as {
        error?: string;
        operationType?: string;
      };
      if (parsed && typeof parsed.error === 'string') {
        displayMessage = parsed.error.includes('Missing or insufficient permissions')
          ? 'You do not have permission to perform that database operation.'
          : parsed.error;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.assign('/');
              }}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Return to VoxNexa
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
