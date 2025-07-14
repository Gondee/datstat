'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface SidebarProps {
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  collapsed,
  onToggle,
}) => {
  return (
    <aside
      className={cn(
        'fixed left-0 top-14 h-[calc(100vh-3.5rem-1.5rem)] bg-black border-r border-green-500/30',
        'transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 bg-black border border-green-500/30 rounded-sm p-1 hover:border-green-500 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="text-green-400 text-xs">
          {collapsed ? '▶' : '◀'}
        </span>
      </button>

      {/* Sidebar Content */}
      <div className="h-full overflow-y-auto p-4">
        {collapsed ? (
          // Collapsed view - show only icons or abbreviated content
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-green-400 text-lg font-bold">D</span>
            </div>
            {/* Add more collapsed navigation items here */}
          </div>
        ) : (
          // Expanded view - show full content
          children
        )}
      </div>
    </aside>
  );
};