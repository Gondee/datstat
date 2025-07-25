'use client';

import { useState, useRef, useEffect } from 'react';
import { Grid, List, Search, Command, Eye, EyeOff, Building2, TrendingUp, LogIn } from 'lucide-react';
import { useDATStore, useCompanies } from '@/utils/store';
import { TerminalCard, MetricCard, DataTable, TerminalButton, TerminalInput, Column } from '@/components/ui';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { LiveDashboard } from '@/components/dashboard/LiveDashboard';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';
import { useRouter } from 'next/navigation';
import { MNavComparisonChart } from '@/components/charts';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<'normal' | 'search' | 'command'>('normal');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    viewMode,
    setViewMode,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    addToComparison,
    fetchCompanies,
    isLoading,
    error,
    lastFetch,
  } = useDATStore();
  
  const companies = useCompanies();

  // Fetch companies on mount and when no data is available
  useEffect(() => {
    // Always fetch if no companies data, otherwise only fetch if we haven't fetched recently (within 5 minutes)
    const shouldFetch = companies.length === 0 || !lastFetch || new Date().getTime() - new Date(lastFetch).getTime() > 5 * 60 * 1000;
    if (shouldFetch) {
      fetchCompanies();
    }
  }, [fetchCompanies, lastFetch, companies.length]);

  // Keyboard navigation
  useKeyboardShortcuts({
    mode: keyboardMode,
    onModeChange: setKeyboardMode,
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onOpenCommand: () => {
      setIsCommandOpen(true);
    },
    onNavigateToCompare: () => router.push('/compare'),
    onNavigateToRankings: () => router.push('/rankings'),
    onNavigateToNews: () => router.push('/news'),
    onNavigateToSettings: () => router.push('/settings'),
  });

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary metrics
  const totalTreasuryValue = companies.reduce((sum, company) => sum + company.metrics.treasuryValue, 0);
  const avgPremiumToNav = companies.reduce((sum, company) => sum + company.metrics.premiumToNavPercent, 0) / companies.length;
  const totalMarketCap = companies.reduce((sum, company) => sum + company.marketCap, 0);

  // Table columns
  const columns: Column<CompanyWithMetrics>[] = [
    {
      key: 'ticker',
      label: 'Ticker',
      sortable: true,
      width: '100px',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[color:var(--terminal-accent)]">{value as string}</span>
          {watchlist.includes(value as string) && (
            <Eye className="w-3 h-3 text-amber-400" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Company',
      sortable: true,
      render: (value) => (
        <span className="text-[color:var(--terminal-text-primary)] truncate max-w-[200px] block">{value as string}</span>
      ),
    },
    {
      key: 'treasury' as keyof CompanyWithMetrics,
      label: 'Primary Asset',
      render: (_, row) => {
        const primaryHolding = row.treasury?.[0];
        return primaryHolding ? (
          <span className="text-[color:var(--terminal-accent-light)] font-mono">
            {primaryHolding.crypto}
          </span>
        ) : (
          <span className="text-[color:var(--terminal-text-secondary)]">-</span>
        );
      },
    },
    {
      key: 'ticker',
      label: 'Treasury Value',
      sortable: true,
      align: 'right',
      render: (_, row) => (
        <span className="font-mono text-[color:var(--terminal-text-primary)]">
          {formatCurrency(row.metrics.treasuryValue, 0)}
        </span>
      ),
    },
    {
      key: 'marketData',
      label: 'Stock Price',
      sortable: true,
      align: 'right',
      render: (_, row) => (
        <div className="text-right">
          <div className="font-mono text-[color:var(--terminal-text-primary)]">
            {formatCurrency(row.marketData.price)}
          </div>
          <div className={`text-xs ${getChangeColor(row.marketData.change24hPercent)}`}>
            {formatPercentage(row.marketData.change24hPercent)}
          </div>
        </div>
      ),
    },
    {
      key: 'metrics',
      label: 'Premium to NAV',
      sortable: true,
      align: 'right',
      render: (_, row) => (
        <span className={`font-mono ${getChangeColor(row.metrics.premiumToNavPercent)}`}>
          {formatPercentage(row.metrics.premiumToNavPercent)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof CompanyWithMetrics,
      label: 'Actions',
      width: '120px',
      render: (_, row) => (
        <div className="flex space-x-1">
          <TerminalButton
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (watchlist.includes(row.ticker)) {
                removeFromWatchlist(row.ticker);
              } else {
                addToWatchlist(row.ticker);
              }
            }}
          >
            {watchlist.includes(row.ticker) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </TerminalButton>
          <TerminalButton
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              addToComparison(row.ticker);
            }}
          >
            <span>+</span>
          </TerminalButton>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--terminal-black)] p-6">
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">DATstat</h1>
            <p className="text-[color:var(--terminal-text-secondary)] text-sm mt-1">
              Digital Asset Treasury Analytics Platform
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TerminalButton
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                icon={<Grid className="w-4 h-4" />}
              >
                Grid
              </TerminalButton>
              <TerminalButton
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                icon={<List className="w-4 h-4" />}
              >
                List
              </TerminalButton>
            </div>
            
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => setIsCommandOpen(true)}
              icon={<Command className="w-4 h-4" />}
            >
              ⌘K
            </TerminalButton>

            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
              icon={<LogIn className="w-4 h-4" />}
              className="text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-accent)]"
            >
              Admin
            </TerminalButton>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--terminal-text-secondary)]" />
            <TerminalInput
              ref={searchInputRef}
              placeholder="Search companies (press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Live Dashboard Integration */}
      <LiveDashboard 
        companies={filteredCompanies}
        initialMarketData={{
          totalTreasuryValue,
          avgPremiumToNav,
          totalMarketCap
        }}
      />


      {/* Loading State */}
      {isLoading && companies.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[color:var(--terminal-accent)] mx-auto mb-4"></div>
            <p className="text-[color:var(--terminal-text-secondary)]">Loading companies data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <TerminalCard className="mb-6">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[color:var(--terminal-text-primary)] font-medium">Error Loading Data</h3>
                <p className="text-[color:var(--terminal-text-secondary)] text-sm">{error}</p>
              </div>
            </div>
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => fetchCompanies()}
            >
              Retry
            </TerminalButton>
          </div>
        </TerminalCard>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCompanies.length === 0 && companies.length === 0 && (
        <TerminalCard className="mb-6">
          <div className="text-center p-8">
            <Building2 className="w-12 h-12 text-[color:var(--terminal-text-secondary)] mx-auto mb-4" />
            <h3 className="text-[color:var(--terminal-text-primary)] font-medium mb-2">No Companies Found</h3>
            <p className="text-[color:var(--terminal-text-secondary)] text-sm mb-4">
              No companies with digital asset treasuries are currently in the database.
            </p>
            <TerminalButton
              variant="primary"
              size="sm"
              onClick={() => fetchCompanies()}
            >
              Refresh Data
            </TerminalButton>
          </div>
        </TerminalCard>
      )}

      {/* No Results State (filtered) */}
      {!isLoading && !error && filteredCompanies.length === 0 && companies.length > 0 && (
        <TerminalCard className="mb-6">
          <div className="text-center p-8">
            <Search className="w-12 h-12 text-[color:var(--terminal-text-secondary)] mx-auto mb-4" />
            <h3 className="text-[color:var(--terminal-text-primary)] font-medium mb-2">No Results Found</h3>
            <p className="text-[color:var(--terminal-text-secondary)] text-sm">
              No companies match your search criteria. Try adjusting your filters.
            </p>
          </div>
        </TerminalCard>
      )}

      {/* Companies Display */}
      {!isLoading && !error && filteredCompanies.length > 0 && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company) => (
            <div
              key={company.ticker}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push(`/company/${company.ticker}`)}
            >
              <TerminalCard
                className="hover:border-[color:var(--terminal-accent)]/70 transition-colors"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[color:var(--terminal-accent)] text-lg">{company.ticker}</span>
                    {watchlist.includes(company.ticker) && (
                      <Eye className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <span className={`text-sm ${getChangeColor(company.marketData.change24hPercent)}`}>
                    {formatPercentage(company.marketData.change24hPercent)}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-[color:var(--terminal-text-primary)] font-medium text-sm truncate">
                    {company.name}
                  </h3>
                  <p className="text-[color:var(--terminal-text-secondary)] text-xs">{company.sector}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)] text-xs">Treasury Value</span>
                    <span className="text-[color:var(--terminal-text-primary)] font-mono text-sm">
                      {formatCurrency(company.metrics.treasuryValue, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)] text-xs">Stock Price</span>
                    <span className="text-[color:var(--terminal-text-primary)] font-mono text-sm">
                      {formatCurrency(company.marketData.price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)] text-xs">Premium to NAV</span>
                    <span className={`font-mono text-sm ${getChangeColor(company.metrics.premiumToNavPercent)}`}>
                      {formatPercentage(company.metrics.premiumToNavPercent)}
                    </span>
                  </div>
                </div>
              </div>
              </TerminalCard>
            </div>
          ))}
        </div>
      ) : !isLoading && !error && filteredCompanies.length > 0 ? (
        <TerminalCard>
          <DataTable
            data={filteredCompanies as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            onRowClick={(company) => router.push(`/company/${(company as unknown as CompanyWithMetrics).ticker}`)}
            keyboardNavigation={true}
          />
        </TerminalCard>
      ) : null}

      {/* Keyboard shortcuts hint */}
      <div className="mt-8 text-center text-[color:var(--terminal-text-muted)] text-xs">
        Press <kbd className="px-1 py-0.5 bg-[color:var(--terminal-accent)]/20 rounded">?</kbd> for help <span>•</span>{' '}
        <kbd className="px-1 py-0.5 bg-[color:var(--terminal-accent)]/20 rounded">/</kbd> to search <span>•</span>{' '}
        <kbd className="px-1 py-0.5 bg-[color:var(--terminal-accent)]/20 rounded">⌘K</kbd> for commands
      </div>
    </div>
  );
}