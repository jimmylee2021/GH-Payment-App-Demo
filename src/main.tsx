import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './sw-register';

// Register/manage Service Worker lifecycle safely
registerServiceWorker();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-white">Application Encountered an Issue</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred. You can reset and reload the application.'}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Reset App Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
