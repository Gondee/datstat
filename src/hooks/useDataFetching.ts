// Data fetching hooks using React Query for DAT Analytics Platform
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Company, CryptoMarketData, DashboardSummary, HistoricalData } from '../types/models';
import { API_ROUTES, apiRequest } from '../api/routes';
import { useAppStore } from '../state/store';

// Query keys
export const queryKeys = {
  companies: ['companies'] as const,
  company: (ticker: string) => ['company', ticker] as const,
  companyTreasury: (ticker: string) => ['company', ticker, 'treasury'] as const,
  companyHistorical: (ticker: string, period: string) => ['company', ticker, 'historical', period] as const,
  cryptoMarket: ['crypto-market'] as const,
  crypto: (symbol: string) => ['crypto', symbol] as const,
  dashboard: ['dashboard'] as const,
  stockQuote: (ticker: string) => ['stock-quote', ticker] as const,
};

// Fetch all companies
export function useCompanies() {
  const { setCompanies, setCompanyLoading } = useAppStore();
  
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: async () => {
      setCompanyLoading(true);
      try {
        const companies = await apiRequest<Company[]>(API_ROUTES.companies.list);
        setCompanies(companies);
        return companies;
      } finally {
        setCompanyLoading(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Fetch single company
export function useCompany(ticker: string) {
  return useQuery({
    queryKey: queryKeys.company(ticker),
    queryFn: () => apiRequest<Company>(API_ROUTES.companies.get(ticker)),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Fetch company historical data
export function useCompanyHistorical(ticker: string, period: string = '1M') {
  return useQuery({
    queryKey: queryKeys.companyHistorical(ticker, period),
    queryFn: () => apiRequest<HistoricalData>(
      API_ROUTES.companies.historical.get(ticker, period)
    ),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// Fetch crypto market data
export function useCryptoMarketData() {
  const { setCryptoMarketData, marketDataLoading } = useAppStore();
  
  return useQuery({
    queryKey: queryKeys.cryptoMarket,
    queryFn: async () => {
      const data = await apiRequest<CryptoMarketData[]>(API_ROUTES.market.crypto.list);
      const marketDataMap = data.reduce((acc, crypto) => {
        acc[crypto.symbol] = crypto;
        return acc;
      }, {} as Record<string, CryptoMarketData>);
      
      setCryptoMarketData(marketDataMap);
      return marketDataMap;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Fetch dashboard summary
export function useDashboard() {
  const { setDashboardSummary } = useAppStore();
  
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const summary = await apiRequest<DashboardSummary>(API_ROUTES.analytics.dashboard);
      setDashboardSummary(summary);
      return summary;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Fetch stock quote
export function useStockQuote(ticker: string) {
  return useQuery({
    queryKey: queryKeys.stockQuote(ticker),
    queryFn: () => apiRequest(API_ROUTES.market.stocks.quote(ticker)),
    enabled: !!ticker,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Mutations

// Update company treasury
export function useUpdateTreasury() {
  const queryClient = useQueryClient();
  const { updateCompany } = useAppStore();
  
  return useMutation({
    mutationFn: ({ ticker, treasury }: { ticker: string; treasury: any }) =>
      apiRequest(API_ROUTES.companies.treasury.update(ticker), {
        method: 'PUT',
        body: treasury,
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.company(variables.ticker) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      
      // Update local state
      updateCompany(variables.ticker, { treasuryHoldings: data });
    },
  });
}

// Add treasury transaction
export function useAddTreasuryTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ticker, transaction }: { ticker: string; transaction: any }) =>
      apiRequest(API_ROUTES.companies.treasury.addTransaction(ticker), {
        method: 'POST',
        body: transaction,
      }),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.company(variables.ticker) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companyTreasury(variables.ticker) });
    },
  });
}

// Batch fetch companies by tickers
export function useBatchCompanies(tickers: string[]) {
  return useQuery({
    queryKey: ['companies-batch', ...tickers],
    queryFn: () => apiRequest<Company[]>(API_ROUTES.companies.list, {
      params: { tickers: tickers.join(',') }
    }),
    enabled: tickers.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Custom hook for prefetching
export function usePrefetchCompany() {
  const queryClient = useQueryClient();
  
  return (ticker: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.company(ticker),
      queryFn: () => apiRequest<Company>(API_ROUTES.companies.get(ticker)),
      staleTime: 1000 * 60 * 5,
    });
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();
  const { updateCompany } = useAppStore();
  
  return {
    updateStockPrice: (ticker: string, newPrice: number) => {
      // Optimistically update the cache
      queryClient.setQueryData<Company>(
        queryKeys.company(ticker),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            stockPrice: {
              ...old.stockPrice,
              current: newPrice,
              lastUpdated: new Date(),
            },
          };
        }
      );
      
      // Update store
      updateCompany(ticker, {
        stockPrice: {
          current: newPrice,
          lastUpdated: new Date(),
        } as any,
      });
    },
  };
}