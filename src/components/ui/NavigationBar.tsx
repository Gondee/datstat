'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { TerminalInput } from './TerminalInput';

interface NavigationBarProps {
  onSearch?: (query: string) => void;
  onCommand?: (command: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  onSearch,
  onCommand,
}) => {
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle command mode with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandMode(true);
        inputRef.current?.focus();
      }
      
      // Focus search with /
      if (e.key === '/' && !isCommandMode) {
        e.preventDefault();
        setIsCommandMode(false);
        inputRef.current?.focus();
      }
      
      // Exit command mode with Escape
      if (e.key === 'Escape' && (isCommandMode || inputValue)) {
        setIsCommandMode(false);
        setInputValue('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandMode, inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCommandMode && onCommand) {
      onCommand(inputValue);
    } else if (!isCommandMode && onSearch) {
      onSearch(inputValue);
    }
    
    setInputValue('');
    setIsCommandMode(false);
    inputRef.current?.blur();
  };

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-green-500/30 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-wider text-green-400">
            DAT <span className="text-green-600">ANALYTICS</span>
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs text-green-600">
            <span>TERMINAL MODE</span>
            <span className="text-green-400">■</span>
          </div>
        </div>

        {/* Search/Command Bar */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-4">
          <TerminalInput
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isCommandMode ? 'Enter command...' : 'Search... (Press / to focus)'}
            prefix={isCommandMode ? '>' : '🔍'}
            className={cn(
              'text-sm',
              isCommandMode && 'border-amber-500/50 focus:ring-amber-500'
            )}
          />
        </form>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            className="px-3 py-1 text-xs text-green-400 hover:text-green-300 transition-colors"
            onClick={() => {
              setIsCommandMode(true);
              inputRef.current?.focus();
            }}
          >
            CMD [⌘K]
          </button>
          <button className="px-3 py-1 text-xs text-green-400 hover:text-green-300 transition-colors">
            HELP [?]
          </button>
        </div>
      </div>
    </nav>
  );
};