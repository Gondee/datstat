'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Company } from '@/types/models';
import { CommandPalette, CommandItem } from '@/components/keyboard/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/keyboard/KeyboardShortcutsModal';
import { 
  useKeyboardShortcuts, 
  KeyboardShortcut, 
  ShortcutMode,
  globalShortcuts,
  vimNavigationShortcuts
} from '@/hooks/useKeyboardShortcuts';

interface KeyboardNavigationContextValue {
  mode: ShortcutMode;
  setMode: (mode: ShortcutMode) => void;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  isShortcutsModalOpen: boolean;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  addRecentCommand: (command: CommandItem) => void;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | null>(null);

export const useKeyboardNavigation = () => {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within KeyboardNavigationProvider');
  }
  return context;
};

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
  companies?: Company[];
  onCompanySelect?: (company: Company) => void;
}

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
  children,
  companies = [],
  onCompanySelect,
}) => {
  const [mode, setMode] = useState<ShortcutMode>('normal');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState<KeyboardShortcut[]>([]);
  const [recentCommands, setRecentCommands] = useState<CommandItem[]>([]);
  
  // Track double key press for vim "gg" command
  const lastKeyPress = useRef<{ key: string; time: number } | null>(null);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
    setMode('command');
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setMode('normal');
  }, []);

  const openShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setCustomShortcuts(prev => [...prev, shortcut]);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setCustomShortcuts(prev => prev.filter(s => s.key !== key));
  }, []);

  const addRecentCommand = useCallback((command: CommandItem) => {
    setRecentCommands(prev => {
      const filtered = prev.filter(cmd => cmd.id !== command.id);
      return [command, ...filtered].slice(0, 5); // Keep only 5 recent commands
    });
  }, []);

  // Enhanced vim navigation with double key support
  const enhancedVimShortcuts: KeyboardShortcut[] = vimNavigationShortcuts.map(shortcut => {
    if (shortcut.key === 'g' && !shortcut.shift) {
      return {
        ...shortcut,
        handler: () => {
          const now = Date.now();
          if (lastKeyPress.current?.key === 'g' && now - lastKeyPress.current.time < 500) {
            // Double 'g' pressed - go to top
            const firstRow = document.querySelector('[data-table-row="0"]') as HTMLElement;
            firstRow?.focus();
            lastKeyPress.current = null;
          } else {
            // First 'g' press
            lastKeyPress.current = { key: 'g', time: now };
          }
        },
      };
    }
    return shortcut;
  });

  // Build all shortcuts
  const allShortcuts: KeyboardShortcut[] = [
    ...globalShortcuts.map(shortcut => {
      // Override handlers for our managed shortcuts
      if (shortcut.key === 'k' && shortcut.cmd) {
        return { ...shortcut, handler: openCommandPalette };
      }
      if (shortcut.key === '?') {
        return { ...shortcut, handler: openShortcutsModal };
      }
      if (shortcut.key === 'esc') {
        return {
          ...shortcut,
          handler: () => {
            if (isCommandPaletteOpen) closeCommandPalette();
            else if (isShortcutsModalOpen) closeShortcutsModal();
            else if (mode !== 'normal') setMode('normal');
          },
        };
      }
      return shortcut;
    }),
    ...(mode === 'vim' ? enhancedVimShortcuts : []),
    ...customShortcuts,
  ];

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    shortcuts: allShortcuts,
    mode,
    enabled: true,
  });

  // Handle mode switching
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Switch to vim mode with 'i' key when not in input
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName);
      
      if (!isInput && e.key === 'i' && mode === 'normal') {
        e.preventDefault();
        setMode('vim');
      }
      
      // Exit vim mode with Escape
      if (e.key === 'Escape' && mode === 'vim') {
        e.preventDefault();
        setMode('normal');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode]);

  const contextValue: KeyboardNavigationContextValue = {
    mode,
    setMode,
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    registerShortcut,
    unregisterShortcut,
    addRecentCommand,
  };

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      {children}
      
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        companies={companies}
        onCompanySelect={onCompanySelect}
        recentCommands={recentCommands}
      />
      
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={closeShortcutsModal}
        shortcuts={allShortcuts}
      />
      
      {/* Mode indicator */}
      {mode !== 'normal' && (
        <div className="fixed bottom-4 left-4 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50">
          {mode === 'vim' && 'VIM MODE'}
          {mode === 'search' && 'SEARCH MODE'}
          {mode === 'command' && 'COMMAND MODE'}
        </div>
      )}
    </KeyboardNavigationContext.Provider>
  );
};