'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTableFocus } from '@/hooks/useFocusManagement';
import { useKeyboardNavigation } from '@/contexts/KeyboardNavigationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface NavigableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T, index: number) => void;
  onRowSelect?: (item: T, index: number) => void;
  selectedRows?: number[];
  className?: string;
  emptyMessage?: string;
}

export function NavigableTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onRowSelect,
  selectedRows = [],
  className = '',
  emptyMessage = 'No data available',
}: NavigableTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const { focusedCell, focusCell, moveFocus } = useTableFocus(tableRef);
  const { mode } = useKeyboardNavigation();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Vim-style navigation shortcuts
  const tableShortcuts = [
    {
      key: 'j',
      description: 'Move down',
      category: 'navigation' as const,
      context: 'table' as const,
      enabled: mode === 'vim',
      handler: () => moveFocus('down'),
    },
    {
      key: 'k',
      description: 'Move up',
      category: 'navigation' as const,
      context: 'table' as const,
      enabled: mode === 'vim',
      handler: () => moveFocus('up'),
    },
    {
      key: 'h',
      description: 'Move left',
      category: 'navigation' as const,
      context: 'table' as const,
      enabled: mode === 'vim',
      handler: () => moveFocus('left'),
    },
    {
      key: 'l',
      description: 'Move right',
      category: 'navigation' as const,
      context: 'table' as const,
      enabled: mode === 'vim',
      handler: () => moveFocus('right'),
    },
    {
      key: 'Enter',
      description: 'Select row',
      category: 'actions' as const,
      context: 'table' as const,
      handler: () => {
        const row = focusedCell.row;
        if (data[row]) {
          onRowClick?.(data[row], row);
        }
      },
    },
    {
      key: ' ',
      description: 'Toggle row selection',
      category: 'actions' as const,
      context: 'table' as const,
      handler: () => {
        const row = focusedCell.row;
        if (data[row]) {
          onRowSelect?.(data[row], row);
        }
      },
    },
  ];

  useKeyboardShortcuts({
    shortcuts: tableShortcuts,
    enabled: true,
  });

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  // Focus first cell on mount
  useEffect(() => {
    if (tableRef.current && data.length > 0) {
      focusCell(0, 0);
    }
  }, [data.length, focusCell]);

  // Update visual focus indicator
  useEffect(() => {
    if (!tableRef.current) return;

    const rows = tableRef.current.querySelectorAll('tbody tr');
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, colIndex) => {
        if (rowIndex === focusedCell.row && colIndex === focusedCell.col) {
          cell.classList.add('ring-2', 'ring-blue-500', 'ring-inset');
        } else {
          cell.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');
        }
      });
    });
  }, [focusedCell]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table
        ref={tableRef}
        className="min-w-full divide-y divide-gray-200"
        data-context="table"
        role="table"
      >
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key as string}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key as string)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortConfig?.key === column.key && (
                    <span className="text-gray-400">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              data-table-row={rowIndex}
              className={`hover:bg-gray-50 ${
                selectedRows.includes(rowIndex) ? 'bg-blue-50' : ''
              } ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={`${rowIndex}-${column.key as string}`}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 focus:outline-none"
                  tabIndex={-1}
                >
                  {column.render
                    ? column.render(item, rowIndex)
                    : item[column.key as keyof T]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Table navigation hint */}
      {mode === 'vim' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Use j/k/h/l to navigate • Enter to select • Space to toggle selection
        </div>
      )}
    </div>
  );
}