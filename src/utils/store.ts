import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyWithMetrics, NewsItem } from '@/types';

export type ViewMode = 'grid' | 'list';
export type SortField = 'ticker' | 'name' | 'treasuryValue' | 'premiumToNav' | 'stockPrice' | 'marketCap';
export type SortDirection = 'asc' | 'desc';

interface FilterState {
  searchQuery: string;
  cryptoFilter: string[];
  sectorFilter: string[];
  minTreasuryValue: number;
  maxTreasuryValue: number;
}

interface DATState {
  // Data
  companies: CompanyWithMetrics[];
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
  
  // UI State
  viewMode: ViewMode;
  selectedCompany: string | null;
  comparisonList: string[];
  watchlist: string[];
  
  // Filtering & Sorting
  filters: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  
  // Computed data
  filteredCompanies: CompanyWithMetrics[];
  
  // Actions
  setCompanies: (companies: CompanyWithMetrics[]) => void;
  setNews: (news: NewsItem[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedCompany: (ticker: string | null) => void;
  addToComparison: (ticker: string) => void;
  removeFromComparison: (ticker: string) => void;
  clearComparison: () => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  setSorting: (field: SortField, direction?: SortDirection) => void;
  applyFiltersAndSort: () => void;
  refreshData: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  fetchCompany: (ticker: string) => Promise<CompanyWithMetrics | null>;
}

const defaultFilters: FilterState = {
  searchQuery: '',
  cryptoFilter: [],
  sectorFilter: [],
  minTreasuryValue: 0,
  maxTreasuryValue: Number.MAX_SAFE_INTEGER,
};

export const useDATStore = create<DATState>()(
  persist(
    (set, get) => ({
      // Initial state
      companies: [],
      news: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      viewMode: 'grid',
      selectedCompany: null,
      comparisonList: [],
      watchlist: [],
      filters: defaultFilters,
      sortField: 'treasuryValue',
      sortDirection: 'desc',
      filteredCompanies: [],

      // Actions
      setCompanies: (companies) => {
        set({ companies });
        get().applyFiltersAndSort();
      },

      setNews: (news) => set({ news }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedCompany: (ticker) => set({ selectedCompany: ticker }),

      addToComparison: (ticker) => {
        const { comparisonList } = get();
        if (!comparisonList.includes(ticker) && comparisonList.length < 4) {
          set({ comparisonList: [...comparisonList, ticker] });
        }
      },

      removeFromComparison: (ticker) => {
        const { comparisonList } = get();
        set({ comparisonList: comparisonList.filter(t => t !== ticker) });
      },

      clearComparison: () => set({ comparisonList: [] }),

      addToWatchlist: (ticker) => {
        const { watchlist } = get();
        if (!watchlist.includes(ticker)) {
          set({ watchlist: [...watchlist, ticker] });
        }
      },

      removeFromWatchlist: (ticker) => {
        const { watchlist } = get();
        set({ watchlist: watchlist.filter(t => t !== ticker) });
      },

      updateFilters: (newFilters) => {
        const { filters } = get();
        set({ filters: { ...filters, ...newFilters } });
        get().applyFiltersAndSort();
      },

      setSorting: (field, direction) => {
        const { sortField, sortDirection } = get();
        const newDirection = direction || (field === sortField && sortDirection === 'desc' ? 'asc' : 'desc');
        set({ sortField: field, sortDirection: newDirection });
        get().applyFiltersAndSort();
      },

      refreshData: async () => {
        await get().fetchCompanies();
      },

      fetchCompanies: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/data/companies');
          if (!response.ok) {
            throw new Error('Failed to fetch companies');
          }
          const data = await response.json();
          if (data.success && data.data) {
            set({ 
              companies: data.data, 
              lastFetch: new Date(),
              isLoading: false 
            });
            get().applyFiltersAndSort();
          } else {
            throw new Error(data.error || 'Failed to fetch companies');
          }
        } catch (error) {
          console.error('Error fetching companies:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch companies',
            isLoading: false 
          });
        }
      },

      fetchCompany: async (ticker: string) => {
        try {
          const response = await fetch(`/api/data/companies/${ticker}`);
          if (!response.ok) {
            throw new Error('Failed to fetch company');
          }
          const data = await response.json();
          if (data.success && data.data) {
            // Update the company in the companies array if it exists
            const { companies } = get();
            const updatedCompanies = companies.map(c => 
              c.ticker === ticker ? data.data : c
            );
            // Add it if it doesn't exist
            if (!companies.find(c => c.ticker === ticker)) {
              updatedCompanies.push(data.data);
            }
            set({ companies: updatedCompanies });
            get().applyFiltersAndSort();
            return data.data;
          } else {
            throw new Error(data.error || 'Failed to fetch company');
          }
        } catch (error) {
          console.error('Error fetching company:', error);
          return null;
        }
      },

      // Helper method to apply filters and sorting
      applyFiltersAndSort: () => {
        const { companies, filters, sortField, sortDirection } = get();
        
        const filtered = companies.filter(company => {
          // Search query filter
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matches = 
              company.ticker.toLowerCase().includes(query) ||
              company.name.toLowerCase().includes(query);
            if (!matches) return false;
          }
          
          // Crypto filter
          if (filters.cryptoFilter.length > 0) {
            const hasFilteredCrypto = company.treasury.some(holding => 
              filters.cryptoFilter.includes(holding.crypto)
            );
            if (!hasFilteredCrypto) return false;
          }
          
          // Sector filter
          if (filters.sectorFilter.length > 0) {
            if (!filters.sectorFilter.includes(company.sector)) return false;
          }
          
          // Treasury value range
          if (company.metrics.treasuryValue < filters.minTreasuryValue ||
              company.metrics.treasuryValue > filters.maxTreasuryValue) {
            return false;
          }
          
          return true;
        });
        
        // Sort the filtered results
        filtered.sort((a, b) => {
          let aValue: unknown, bValue: unknown;
          
          switch (sortField) {
            case 'ticker':
              aValue = a.ticker;
              bValue = b.ticker;
              break;
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'treasuryValue':
              aValue = a.metrics.treasuryValue;
              bValue = b.metrics.treasuryValue;
              break;
            case 'premiumToNav':
              aValue = a.metrics.premiumToNav;
              bValue = b.metrics.premiumToNav;
              break;
            case 'stockPrice':
              aValue = a.marketData.price;
              bValue = b.marketData.price;
              break;
            case 'marketCap':
              aValue = a.marketCap;
              bValue = b.marketCap;
              break;
            default:
              aValue = a.metrics.treasuryValue;
              bValue = b.metrics.treasuryValue;
          }
          
          if (typeof aValue === 'string') {
            return sortDirection === 'asc' 
              ? aValue.localeCompare(bValue as string)
              : (bValue as string).localeCompare(aValue);
          }
          
          return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        });
        
        set({ filteredCompanies: filtered });
      },
    }),
    {
      name: 'dat-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
        watchlist: state.watchlist,
        filters: state.filters,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
      }),
    }
  )
);

// Initialize the computed state

// Selector hooks for performance
export const useCompanies = () => useDATStore(state => state.filteredCompanies);
export const useSelectedCompany = () => useDATStore(state => state.selectedCompany);
export const useComparisonList = () => useDATStore(state => state.comparisonList);
export const useWatchlist = () => useDATStore(state => state.watchlist);
export const useViewMode = () => useDATStore(state => state.viewMode);
export const useFilters = () => useDATStore(state => state.filters);
export const useNews = () => useDATStore(state => state.news);
export const useIsLoading = () => useDATStore(state => state.isLoading);
export const useError = () => useDATStore(state => state.error);
export const useFetchCompanies = () => useDATStore(state => state.fetchCompanies);
export const useFetchCompany = () => useDATStore(state => state.fetchCompany);