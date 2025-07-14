// State management using Zustand for DAT Analytics Platform
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Company, CryptoMarketData, DashboardSummary, FilterOptions, SortOptions } from '../types/models';

// Application state interface
interface AppState {
  // Company data
  companies: Company[];
  selectedCompany: Company | null;
  companyLoading: boolean;
  companyError: string | null;

  // Market data
  cryptoMarketData: Record<string, CryptoMarketData>;
  marketDataLoading: boolean;
  marketDataError: string | null;

  // Dashboard
  dashboardSummary: DashboardSummary | null;
  dashboardLoading: boolean;

  // Filters and sorting
  filters: FilterOptions;
  sort: SortOptions;

  // User preferences
  watchlist: string[];
  theme: 'light' | 'dark';
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';

  // Real-time updates
  isConnected: boolean;
  lastUpdate: Date | null;

  // Actions
  setCompanies: (companies: Company[]) => void;
  selectCompany: (ticker: string | null) => void;
  updateCompany: (ticker: string, updates: Partial<Company>) => void;
  
  setCryptoMarketData: (data: Record<string, CryptoMarketData>) => void;
  updateCryptoPrice: (symbol: string, price: number) => void;
  
  setDashboardSummary: (summary: DashboardSummary) => void;
  
  setFilters: (filters: FilterOptions) => void;
  setSort: (sort: SortOptions) => void;
  
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrency: (currency: 'USD' | 'EUR' | 'GBP' | 'CAD') => void;
  
  setConnectionStatus: (status: boolean) => void;
  
  // Computed values
  getFilteredCompanies: () => Company[];
  getSortedCompanies: () => Company[];
  getTotalTreasuryValue: () => number;
}

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        companies: [],
        selectedCompany: null,
        companyLoading: false,
        companyError: null,
        
        cryptoMarketData: {},
        marketDataLoading: false,
        marketDataError: null,
        
        dashboardSummary: null,
        dashboardLoading: false,
        
        filters: {},
        sort: { field: 'marketCap', direction: 'desc' },
        
        watchlist: [],
        theme: 'light',
        currency: 'USD',
        
        isConnected: false,
        lastUpdate: null,

        // Actions
        setCompanies: (companies) => set({ 
          companies, 
          companyLoading: false,
          lastUpdate: new Date() 
        }),

        selectCompany: (ticker) => set((state) => ({
          selectedCompany: ticker 
            ? state.companies.find(c => c.ticker === ticker) || null
            : null
        })),

        updateCompany: (ticker, updates) => set((state) => ({
          companies: state.companies.map(c => 
            c.ticker === ticker ? { ...c, ...updates } : c
          ),
          selectedCompany: state.selectedCompany?.ticker === ticker
            ? { ...state.selectedCompany, ...updates }
            : state.selectedCompany,
          lastUpdate: new Date()
        })),

        setCryptoMarketData: (data) => set({ 
          cryptoMarketData: data,
          marketDataLoading: false,
          lastUpdate: new Date()
        }),

        updateCryptoPrice: (symbol, price) => set((state) => {
          const updatedMarketData = {
            ...state.cryptoMarketData,
            [symbol]: {
              ...state.cryptoMarketData[symbol],
              price,
              lastUpdated: new Date()
            }
          };

          // Recalculate company metrics when crypto prices change
          const updatedCompanies = state.companies.map(company => {
            const hasHolding = company.treasuryHoldings.some(h => h.cryptoType === symbol);
            if (!hasHolding) return company;

            // Recalculate treasury values
            const totalTreasuryValue = company.treasuryHoldings.reduce((sum, holding) => {
              const cryptoPrice = holding.cryptoType === symbol 
                ? price 
                : state.cryptoMarketData[holding.cryptoType]?.price || 0;
              return sum + (holding.amount * cryptoPrice);
            }, 0);

            const sharesOutstanding = company.financialMetrics.sharesOutstanding;
            const treasuryValuePerShare = totalTreasuryValue / sharesOutstanding;
            const netAssetValue = company.financialMetrics.shareholdersEquity + totalTreasuryValue;
            const navPerShare = netAssetValue / sharesOutstanding;
            const premiumToNav = company.stockPrice.current - navPerShare;
            const premiumToNavPercent = (premiumToNav / navPerShare) * 100;

            return {
              ...company,
              calculatedMetrics: {
                ...company.calculatedMetrics,
                totalTreasuryValue,
                treasuryValuePerShare,
                netAssetValue,
                navPerShare,
                premiumToNav,
                premiumToNavPercent
              }
            };
          });

          return {
            cryptoMarketData: updatedMarketData,
            companies: updatedCompanies,
            lastUpdate: new Date()
          };
        }),

        setDashboardSummary: (summary) => set({ 
          dashboardSummary: summary,
          dashboardLoading: false 
        }),

        setFilters: (filters) => set({ filters }),
        setSort: (sort) => set({ sort }),

        addToWatchlist: (ticker) => set((state) => ({
          watchlist: [...new Set([...state.watchlist, ticker])]
        })),

        removeFromWatchlist: (ticker) => set((state) => ({
          watchlist: state.watchlist.filter(t => t !== ticker)
        })),

        setTheme: (theme) => set({ theme }),
        setCurrency: (currency) => set({ currency }),

        setConnectionStatus: (status) => set({ isConnected: status }),

        // Computed values
        getFilteredCompanies: () => {
          const state = get();
          const { companies, filters } = state;

          return companies.filter(company => {
            if (filters.cryptoTypes?.length) {
              const hasCrypto = company.treasuryHoldings.some(h => 
                filters.cryptoTypes!.includes(h.cryptoType)
              );
              if (!hasCrypto) return false;
            }

            if (filters.minMarketCap !== undefined) {
              if (company.financialMetrics.marketCap < filters.minMarketCap) return false;
            }

            if (filters.maxMarketCap !== undefined) {
              if (company.financialMetrics.marketCap > filters.maxMarketCap) return false;
            }

            if (filters.minPremiumToNav !== undefined) {
              if (company.calculatedMetrics.premiumToNavPercent < filters.minPremiumToNav) return false;
            }

            if (filters.maxPremiumToNav !== undefined) {
              if (company.calculatedMetrics.premiumToNavPercent > filters.maxPremiumToNav) return false;
            }

            if (filters.sectors?.length) {
              if (!filters.sectors.includes(company.sector)) return false;
            }

            return true;
          });
        },

        getSortedCompanies: () => {
          const state = get();
          const filtered = state.getFilteredCompanies();
          const { sort } = state;

          return [...filtered].sort((a, b) => {
            let aValue: number;
            let bValue: number;

            switch (sort.field) {
              case 'ticker':
                return sort.direction === 'asc' 
                  ? a.ticker.localeCompare(b.ticker)
                  : b.ticker.localeCompare(a.ticker);
              case 'marketCap':
                aValue = a.financialMetrics.marketCap;
                bValue = b.financialMetrics.marketCap;
                break;
              case 'premiumToNav':
                aValue = a.calculatedMetrics.premiumToNavPercent;
                bValue = b.calculatedMetrics.premiumToNavPercent;
                break;
              case 'treasuryValue':
                aValue = a.calculatedMetrics.totalTreasuryValue;
                bValue = b.calculatedMetrics.totalTreasuryValue;
                break;
              case 'dayChange':
                aValue = a.stockPrice.changePercent;
                bValue = b.stockPrice.changePercent;
                break;
              default:
                return 0;
            }

            return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
          });
        },

        getTotalTreasuryValue: () => {
          const state = get();
          return state.companies.reduce((sum, company) => 
            sum + company.calculatedMetrics.totalTreasuryValue, 0
          );
        }
      }),
      {
        name: 'dat-analytics-store',
        partialize: (state) => ({
          watchlist: state.watchlist,
          theme: state.theme,
          currency: state.currency,
          filters: state.filters,
          sort: state.sort
        })
      }
    ),
    {
      name: 'DAT Analytics Store'
    }
  )
);