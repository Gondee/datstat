import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type KeyboardMode = 'normal' | 'search' | 'command';

interface KeyboardShortcutsProps {
  mode?: KeyboardMode;
  onModeChange?: (mode: KeyboardMode) => void;
  onFocusSearch?: () => void;
  onOpenCommand?: () => void;
  onToggleHelp?: () => void;
  onNavigateToCompare?: () => void;
  onNavigateToRankings?: () => void;
  onNavigateToNews?: () => void;
  onNavigateToSettings?: () => void;
  onExportData?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  mode = 'normal',
  onModeChange,
  onFocusSearch,
  onOpenCommand,
  onToggleHelp,
  onNavigateToCompare,
  onNavigateToRankings,
  onNavigateToNews,
  onNavigateToSettings,
  onExportData,
  disabled = false,
}: KeyboardShortcutsProps = {}) {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';

    // Handle mode-specific shortcuts
    if (mode === 'search' || mode === 'command') {
      if (event.key === 'Escape') {
        event.preventDefault();
        onModeChange?.('normal');
      }
      return;
    }

    // Global shortcuts (only in normal mode and not in input fields)
    if (mode === 'normal' && !isInInput) {
      // Handle modifiers (Cmd/Ctrl + key)
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            onOpenCommand?.();
            onModeChange?.('command');
            break;
          case 's':
            event.preventDefault();
            onNavigateToSettings?.();
            break;
          case 'e':
            event.preventDefault();
            onExportData?.();
            break;
        }
        return;
      }

      // Single key shortcuts
      switch (event.key) {
        case '/':
          event.preventDefault();
          onFocusSearch?.();
          onModeChange?.('search');
          break;
        case '?':
          event.preventDefault();
          onToggleHelp?.();
          break;
        case 'c':
          event.preventDefault();
          onNavigateToCompare?.();
          break;
        case 'r':
          event.preventDefault();
          onNavigateToRankings?.();
          break;
        case 'n':
          event.preventDefault();
          onNavigateToNews?.();
          break;
        case 'h':
          event.preventDefault();
          router.push('/');
          break;
        case 'Escape':
          event.preventDefault();
          onModeChange?.('normal');
          break;
      }
    }
  }, [
    mode,
    disabled,
    onModeChange,
    onFocusSearch,
    onOpenCommand,
    onToggleHelp,
    onNavigateToCompare,
    onNavigateToRankings,
    onNavigateToNews,
    onNavigateToSettings,
    onExportData,
    router,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { mode };
}

// Hook for Vim-style navigation in tables and lists
interface VimNavigationProps {
  itemCount: number;
  onSelect?: (index: number) => void;
  onActivate?: (index: number) => void;
  disabled?: boolean;
}

export function useVimNavigation({
  itemCount,
  onSelect,
  onActivate,
  disabled = false,
}: VimNavigationProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    const target = event.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    if (isInInput) return;

    const currentIndex = getCurrentSelectedIndex();

    switch (event.key) {
      case 'j':
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < itemCount - 1) {
          onSelect?.(currentIndex + 1);
        }
        break;
      case 'k':
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          onSelect?.(currentIndex - 1);
        }
        break;
      case 'g':
        if (event.repeat) return; // Prevent rapid fire
        // Check for double 'g' to go to top
        setTimeout(() => {
          const checkForDoubleG = (e: KeyboardEvent) => {
            if (e.key === 'g') {
              event.preventDefault();
              onSelect?.(0);
              document.removeEventListener('keydown', checkForDoubleG);
            }
          };
          document.addEventListener('keydown', checkForDoubleG);
          setTimeout(() => document.removeEventListener('keydown', checkForDoubleG), 500);
        }, 0);
        break;
      case 'G':
        event.preventDefault();
        onSelect?.(itemCount - 1);
        break;
      case 'Enter':
        event.preventDefault();
        onActivate?.(currentIndex);
        break;
    }
  }, [itemCount, onSelect, onActivate, disabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Helper function to get currently selected index
function getCurrentSelectedIndex(): number {
  const selected = document.querySelector('[data-selected="true"]');
  return selected ? parseInt(selected.getAttribute('data-index') || '0', 10) : 0;
}