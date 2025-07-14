import { useRef, useEffect, useCallback, useState } from 'react';

interface FocusableElement extends HTMLElement {
  tabIndex: number;
  disabled?: boolean;
}

interface UseFocusManagementProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export const useFocusManagement = ({
  containerRef,
  enabled = true,
  trapFocus = false,
  restoreFocus = true,
  initialFocusRef,
}: UseFocusManagementProps) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<FocusableElement[]>([]);

  // Get all focusable elements within container
  const getFocusableElements = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];

    const selector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
    ].join(',');

    const elements = Array.from(
      containerRef.current.querySelectorAll<FocusableElement>(selector)
    );

    // Filter out elements that are not visible
    return elements.filter(el => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetParent !== null
      );
    });
  }, [containerRef]);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    focusableElementsRef.current = getFocusableElements();
  }, [getFocusableElements]);

  // Get currently focused element index
  const getCurrentFocusIndex = useCallback((): number => {
    const activeElement = document.activeElement as FocusableElement;
    return focusableElementsRef.current.indexOf(activeElement);
  }, []);

  // Focus element by index
  const focusByIndex = useCallback((index: number) => {
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    // Wrap around
    let targetIndex = index;
    if (index < 0) {
      targetIndex = elements.length - 1;
    } else if (index >= elements.length) {
      targetIndex = 0;
    }

    elements[targetIndex]?.focus();
  }, []);

  // Navigation methods
  const focusNext = useCallback(() => {
    const currentIndex = getCurrentFocusIndex();
    focusByIndex(currentIndex + 1);
  }, [getCurrentFocusIndex, focusByIndex]);

  const focusPrevious = useCallback(() => {
    const currentIndex = getCurrentFocusIndex();
    focusByIndex(currentIndex - 1);
  }, [getCurrentFocusIndex, focusByIndex]);

  const focusFirst = useCallback(() => {
    focusByIndex(0);
  }, [focusByIndex]);

  const focusLast = useCallback(() => {
    focusByIndex(focusableElementsRef.current.length - 1);
  }, [focusByIndex]);

  // Focus trap handler
  useEffect(() => {
    if (!enabled || !trapFocus || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const activeElement = document.activeElement as FocusableElement;
      const currentIndex = elements.indexOf(activeElement);

      // If focus is outside container, bring it back
      if (currentIndex === -1) {
        event.preventDefault();
        elements[0]?.focus();
        return;
      }

      // Handle tab navigation
      if (event.shiftKey) {
        // Shift+Tab (backwards)
        if (currentIndex === 0) {
          event.preventDefault();
          elements[elements.length - 1]?.focus();
        }
      } else {
        // Tab (forwards)
        if (currentIndex === elements.length - 1) {
          event.preventDefault();
          elements[0]?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, trapFocus, containerRef, getFocusableElements]);

  // Initial focus and restore focus
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store previous focus
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Set initial focus
    updateFocusableElements();
    
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusableElementsRef.current.length > 0) {
      focusableElementsRef.current[0].focus();
    }

    // Restore focus on unmount
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, containerRef, initialFocusRef, restoreFocus, updateFocusableElements]);

  // Update focusable elements on DOM changes
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const observer = new MutationObserver(() => {
      updateFocusableElements();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex'],
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, containerRef, updateFocusableElements]);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusByIndex,
    updateFocusableElements,
    focusableElements: focusableElementsRef.current,
  };
};

// Hook for managing focus within data tables
export const useTableFocus = (tableRef: React.RefObject<HTMLTableElement>) => {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });

  const getCellElement = useCallback((row: number, col: number): HTMLElement | null => {
    if (!tableRef.current) return null;
    
    const rows = tableRef.current.querySelectorAll('tbody tr');
    const targetRow = rows[row];
    if (!targetRow) return null;

    const cells = targetRow.querySelectorAll('td');
    return cells[col] as HTMLElement || null;
  }, [tableRef]);

  const focusCell = useCallback((row: number, col: number) => {
    const cell = getCellElement(row, col);
    if (cell) {
      cell.setAttribute('tabindex', '0');
      cell.focus();
      setFocusedCell({ row, col });
    }
  }, [getCellElement]);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!tableRef.current) return;

    const rows = tableRef.current.querySelectorAll('tbody tr');
    const numRows = rows.length;
    const numCols = rows[0]?.querySelectorAll('td').length || 0;

    let newRow = focusedCell.row;
    let newCol = focusedCell.col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, focusedCell.row - 1);
        break;
      case 'down':
        newRow = Math.min(numRows - 1, focusedCell.row + 1);
        break;
      case 'left':
        newCol = Math.max(0, focusedCell.col - 1);
        break;
      case 'right':
        newCol = Math.min(numCols - 1, focusedCell.col + 1);
        break;
    }

    if (newRow !== focusedCell.row || newCol !== focusedCell.col) {
      // Remove tabindex from old cell
      const oldCell = getCellElement(focusedCell.row, focusedCell.col);
      oldCell?.setAttribute('tabindex', '-1');

      // Focus new cell
      focusCell(newRow, newCol);
    }
  }, [tableRef, focusedCell, getCellElement, focusCell]);

  // Keyboard navigation
  useEffect(() => {
    if (!tableRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (!tableRef.current?.contains(target)) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveFocus('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveFocus('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveFocus('right');
          break;
        case 'Home':
          event.preventDefault();
          if (event.ctrlKey) {
            focusCell(0, 0);
          } else {
            focusCell(focusedCell.row, 0);
          }
          break;
        case 'End':
          event.preventDefault();
          const rows = tableRef.current.querySelectorAll('tbody tr');
          const numRows = rows.length;
          const numCols = rows[0]?.querySelectorAll('td').length || 0;
          
          if (event.ctrlKey) {
            focusCell(numRows - 1, numCols - 1);
          } else {
            focusCell(focusedCell.row, numCols - 1);
          }
          break;
      }
    };

    tableRef.current.addEventListener('keydown', handleKeyDown);
    
    return () => {
      tableRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableRef, focusedCell, moveFocus, focusCell]);

  return {
    focusedCell,
    focusCell,
    moveFocus,
  };
};