'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { NavigationBar } from './NavigationBar';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { ErrorBoundary } from './ErrorBoundary';

interface TerminalLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  onSearch?: (query: string) => void;
  onCommand?: (command: string) => void;
}

export const TerminalLayout: React.FC<TerminalLayoutProps> = ({
  children,
  sidebarContent,
  onSearch,
  onCommand,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Navigation Bar */}
      <NavigationBar onSearch={onSearch} onCommand={onCommand} />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        {sidebarContent && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarContent}
          </Sidebar>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-auto transition-all duration-300',
            sidebarContent && !sidebarCollapsed && 'ml-64',
            sidebarContent && sidebarCollapsed && 'ml-16'
          )}
        >
          <ErrorBoundary>
            <PageTransition>
              <div className="p-6">{children}</div>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-green-500/30 px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-green-600">READY</span>
          <span className="text-green-400">DAT ANALYTICS v1.0.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-600">Press ? for help</span>
          <span className="text-green-600">
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>
    </div>
  );
};