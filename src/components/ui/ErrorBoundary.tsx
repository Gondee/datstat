'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TerminalCard, TerminalButton } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
          <TerminalCard className="max-w-2xl w-full p-8">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold font-mono text-red-400">
                SYSTEM ERROR DETECTED
              </h1>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                <p className="text-red-400 font-mono text-sm">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-green-400/60 text-sm font-mono">
                  The application encountered an unexpected error. This has been logged for investigation.
                </p>
                <p className="text-green-400/60 text-sm font-mono">
                  Error Code: {this.state.error?.name || 'UNKNOWN_ERROR'}
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <TerminalButton
                  variant="primary"
                  onClick={this.handleReset}
                >
                  RETRY
                </TerminalButton>
                <TerminalButton
                  variant="secondary"
                  onClick={() => window.location.href = '/'}
                >
                  HOME
                </TerminalButton>
              </div>
            </div>
          </TerminalCard>
        </div>
      );
    }

    return this.props.children;
  }
}