'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Clock, Building2, TrendingUp, Newspaper, Settings, BarChart3, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCompanies } from '@/utils/store';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  keywords: string[];
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const companies = useCompanies();

  // Build commands list
  const commands: Command[] = [
    // Navigation commands
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Go to main dashboard',
      icon: <BarChart3 size={16} />,
      keywords: ['dashboard', 'home', 'main'],
      action: () => router.push('/'),
      group: 'Navigation',
    },
    {
      id: 'nav-compare',
      label: 'Compare Companies',
      description: 'Compare treasury holdings',
      icon: <TrendingUp size={16} />,
      keywords: ['compare', 'comparison', 'vs'],
      action: () => router.push('/compare'),
      group: 'Navigation',
    },
    {
      id: 'nav-rankings',
      label: 'Rankings',
      description: 'View company rankings',
      icon: <BarChart3 size={16} />,
      keywords: ['rankings', 'rank', 'leaderboard', 'top'],
      action: () => router.push('/rankings'),
      group: 'Navigation',
    },
    {
      id: 'nav-news',
      label: 'News & Events',
      description: 'Latest market news',
      icon: <Newspaper size={16} />,
      keywords: ['news', 'events', 'updates', 'market'],
      action: () => router.push('/news'),
      group: 'Navigation',
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Application preferences',
      icon: <Settings size={16} />,
      keywords: ['settings', 'preferences', 'config'],
      action: () => router.push('/settings'),
      group: 'Navigation',
    },
    {
      id: 'nav-help',
      label: 'Help & Shortcuts',
      description: 'View keyboard shortcuts',
      icon: <HelpCircle size={16} />,
      keywords: ['help', 'shortcuts', 'keyboard', 'guide'],
      action: () => router.push('/help'),
      group: 'Navigation',
    },
    // Company commands
    ...companies.map(company => ({
      id: `company-${company.ticker}`,
      label: `${company.ticker} - ${company.name}`,
      description: `View ${company.name} details`,
      icon: <Building2 size={16} />,
      keywords: [company.ticker.toLowerCase(), company.name.toLowerCase()],
      action: () => router.push(`/company/${company.ticker}`),
      group: 'Companies',
    })),
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter(command =>
        command.label.toLowerCase().includes(query.toLowerCase()) ||
        command.keywords.some(keyword => keyword.includes(query.toLowerCase()))
      )
    : commands.filter(command => recentCommands.includes(command.id)).slice(0, 5);

  // Group commands
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.group]) acc[command.group] = [];
    acc[command.group].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  // Handle command execution
  const executeCommand = useCallback((command: Command) => {
    command.action();
    
    // Add to recent commands
    setRecentCommands(prev => {
      const updated = [command.id, ...prev.filter(id => id !== command.id)].slice(0, 10);
      localStorage.setItem('dat-recent-commands', JSON.stringify(updated));
      return updated;
    });
    
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose, executeCommand]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load recent commands
  useEffect(() => {
    const stored = localStorage.getItem('dat-recent-commands');
    if (stored) {
      setRecentCommands(JSON.parse(stored));
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/4 w-full max-w-lg -translate-x-1/2 transform">
        <div className="border border-green-500/50 bg-black/95 shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center border-b border-green-500/50 px-4 py-3">
            <Search className="mr-3 h-4 w-4 text-green-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-green-100 placeholder-green-500/50 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="ml-2 text-green-500/50 hover:text-green-400"
              >
                ×
              </button>
            )}
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedCommands).length === 0 ? (
              <div className="px-4 py-8 text-center text-green-500/50">
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([group, groupCommands]) => (
                <div key={group}>
                  <div className="border-b border-green-500/20 px-4 py-2 text-xs font-semibold text-green-400">
                    {group}
                  </div>
                  {groupCommands.map((command) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    return (
                      <button
                        key={command.id}
                        onClick={() => executeCommand(command)}
                        className={cn(
                          'flex w-full items-center px-4 py-3 text-left hover:bg-green-500/10',
                          globalIndex === selectedIndex && 'bg-green-500/20'
                        )}
                      >
                        <div className="mr-3 text-green-400">
                          {command.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-green-100">{command.label}</div>
                          {command.description && (
                            <div className="text-xs text-green-500/70">
                              {command.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-green-500/50" />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-green-500/50 px-4 py-2 text-xs text-green-500/50">
            <div className="flex items-center justify-between">
              <span>↑↓ navigate • ↵ select • esc close</span>
              {recentCommands.length > 0 && !query && (
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  Recent
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}