'use client';

import { useEffect } from 'react';
import { useFetchCompanies, useIsLoading, useError } from '@/utils/store';

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const fetchCompanies = useFetchCompanies();
  const isLoading = useIsLoading();
  const error = useError();

  useEffect(() => {
    // Fetch companies on mount
    fetchCompanies();
    
    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(() => {
      fetchCompanies();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchCompanies]);

  if (isLoading && !error) {
    return (
      <div className="min-h-screen bg-[color:var(--terminal-black)] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--terminal-accent)]"></div>
          </div>
          <p className="text-[color:var(--terminal-accent)] font-mono">Loading treasury data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[color:var(--terminal-black)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl text-[color:var(--terminal-danger)] mb-4">Error Loading Data</h2>
          <p className="text-[color:var(--terminal-text-secondary)] mb-4">{error}</p>
          <button
            onClick={() => fetchCompanies()}
            className="px-4 py-2 bg-[color:var(--terminal-accent)] text-[color:var(--terminal-bg)] rounded hover:opacity-80 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}