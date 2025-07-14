'use client';

import React, { useState } from 'react';
import { TerminalButton } from './TerminalButton';
import { cn } from '@/utils/cn';

interface ExportOption {
  label: string;
  action: () => void | Promise<void>;
  icon?: string;
}

interface ExportButtonProps {
  options: ExportOption[];
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  options,
  label = 'EXPORT',
  size = 'sm',
  className
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (option: ExportOption) => {
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      await option.action();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <TerminalButton
        variant="secondary"
        size={size}
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={className}
      >
        {isExporting ? 'EXPORTING...' : label} ↓
      </TerminalButton>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-black border border-green-500/50 rounded shadow-lg z-50">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleExport(option)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-mono",
                  "text-green-400 hover:bg-green-500/10 hover:text-green-300",
                  "transition-colors flex items-center gap-2"
                )}
              >
                {option.icon && <span>{option.icon}</span>}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};