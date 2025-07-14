'use client';

import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useVimNavigation } from '@/hooks/useKeyboardShortcuts';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  onRowSelect?: (row: T, index: number) => void;
  selectedRows?: Set<number>;
  loading?: boolean;
  keyboardNavigation?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  compact?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  className,
  onRowClick,
  selectedRows = new Set(),
  loading = false,
  keyboardNavigation = true,
  stickyHeader = true,
  striped = true,
  compact = false,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Vim navigation
  useVimNavigation({
    itemCount: data.length,
    onSelect: setSelectedIndex,
    onActivate: (index) => {
      if (onRowClick) {
        onRowClick(data[index], index);
      }
    },
    disabled: !keyboardNavigation,
  });

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="w-3 h-3 text-[color:var(--terminal-text-muted)]" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-[color:var(--terminal-accent)]" />
      : <ChevronDown className="w-3 h-3 text-[color:var(--terminal-accent)]" />;
  };

  const rowClasses = (index: number) => cn(
    'border-b border-[color:var(--terminal-border)] transition-colors duration-150',
    compact ? 'h-8' : 'h-12',
    striped && index % 2 === 1 && 'bg-[color:var(--terminal-accent)]/5',
    selectedRows.has(index) && 'bg-[color:var(--terminal-accent)]/20',
    selectedIndex === index && keyboardNavigation && 'bg-[color:var(--terminal-accent)]/30 ring-1 ring-[color:var(--terminal-accent)]',
    hoveredIndex === index && 'bg-[color:var(--terminal-accent)]/10',
    onRowClick && 'cursor-pointer hover:bg-[color:var(--terminal-accent)]/15'
  );

  if (loading) {
    return (
      <div className={cn('border border-[color:var(--terminal-border)] rounded-lg bg-[color:var(--terminal-surface)]', className)}>
        <div className="p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-[color:var(--terminal-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-[color:var(--terminal-text-secondary)]">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-[color:var(--terminal-border)] rounded-lg bg-[color:var(--terminal-surface)] overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className={cn(
              'border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]',
              stickyHeader && 'sticky top-0 z-10'
            )}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-[color:var(--terminal-accent)] font-medium',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:text-[color:var(--terminal-accent-light)] select-none',
                    compact && 'py-2'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={rowClasses(index)}
                data-index={index}
                data-selected={selectedIndex === index}
                onClick={() => onRowClick?.(row, index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-[color:var(--terminal-text-primary)]',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      compact && 'py-2'
                    )}
                  >
                    {column.render 
                      ? column.render(row[column.key], row, index)
                      : String(row[column.key] ?? '')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedData.length === 0 && !loading && (
          <div className="p-8 text-center text-[color:var(--terminal-text-secondary)]">
            No data available
          </div>
        )}
      </div>
      
      {keyboardNavigation && sortedData.length > 0 && (
        <div className="border-t border-[color:var(--terminal-border)] px-4 py-2 text-xs text-[color:var(--terminal-text-secondary)]">
          j/k or ↑↓ navigate <span>•</span> Enter select <span>•</span> {sortedData.length} rows
        </div>
      )}
    </div>
  );
}