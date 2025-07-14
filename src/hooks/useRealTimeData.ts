import { useState, useEffect, useCallback } from 'react';
import { useWebSocketData, useRealTimePrices } from './useWebSocket';
import { useDataFreshness } from './useDataFreshness';
import { useDATStore } from '@/utils/store';

export interface RealTimeDataConfig {
  enableWebSocket: boolean;
  enableFreshnessTracking: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  freshnessThreshold: number; // seconds
}

const DEFAULT_CONFIG: RealTimeDataConfig = {
  enableWebSocket: true,
  enableFreshnessTracking: true,
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  freshnessThreshold: 60, // 1 minute
};

// Hook for real-time company data
export function useRealTimeCompanyData(
  ticker: string,
  config: Partial<RealTimeDataConfig> = {}
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { setCompanies } = useDATStore();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket data for real-time updates
  const {
    data: wsData,
    isLoading: wsLoading,
    error: wsError,
    lastUpdated: wsLastUpdated,
  } = useWebSocketData([`stocks:${ticker}`], {
    url: 'ws://localhost:8080/ws/data',
    autoReconnect: true,
  });

  // Data freshness tracking
  const [freshness, freshnessActions] = useDataFreshness(
    {
      freshThreshold: cfg.freshnessThreshold,
      staleThreshold: cfg.freshnessThreshold * 3,
      autoRefresh: cfg.autoRefresh,
    },
    useCallback(async () => {
      await refreshCompanyData();
    }, [ticker])
  );

  const refreshCompanyData = useCallback(async () => {
    try {
      setIsLoading(true);
      freshnessActions.markRefreshing(true);
      
      const response = await fetch(`/api/data/companies/${ticker}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch company data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCompany(data);
      setError(null);
      freshnessActions.markUpdated();
      
      // Update global store
      setCompanies([data]);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      freshnessActions.markRefreshing(false);
    }
  }, [ticker, freshnessActions, setCompanies]);

  // Initial data load
  useEffect(() => {
    refreshCompanyData();
  }, [refreshCompanyData]);

  // Handle WebSocket updates
  useEffect(() => {
    if (wsData && wsLastUpdated) {
      setCompany(prev => ({
        ...prev,
        ...wsData,
      }));
      freshnessActions.markUpdated(wsLastUpdated);
    }
  }, [wsData, wsLastUpdated, freshnessActions]);

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      setError(wsError);
    }
  }, [wsError]);

  return {
    company,
    isLoading: isLoading || wsLoading,
    error: error || wsError,
    freshness: freshness,
    refresh: refreshCompanyData,
    lastUpdated: wsLastUpdated || freshness.lastUpdated,
  };
}

// Hook for real-time market data (crypto + stocks)
export function useRealTimeMarketData(config: Partial<RealTimeDataConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time crypto prices
  const {
    prices: cryptoPrices,
    isLoading: cryptoLoading,
    error: cryptoError,
    lastUpdated: cryptoLastUpdated,
  } = useRealTimePrices(['BTC', 'ETH', 'SOL'], 'crypto');

  // Real-time stock prices
  const {
    prices: stockPrices,
    isLoading: stockLoading,
    error: stockError,
    lastUpdated: stockLastUpdated,
  } = useRealTimePrices(['MSTR', 'DFDV', 'UPXI', 'SBET'], 'stocks');

  // Data freshness for combined market data
  const [freshness, freshnessActions] = useDataFreshness(
    {
      freshThreshold: cfg.freshnessThreshold,
      staleThreshold: cfg.freshnessThreshold * 2,
      autoRefresh: cfg.autoRefresh,
    },
    useCallback(async () => {
      await refreshMarketData();
    }, [])
  );

  const refreshMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      freshnessActions.markRefreshing(true);
      
      // Trigger data refresh via API
      const response = await fetch('/api/data/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataTypes: ['crypto', 'stocks'],
          forceRefresh: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh market data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setError(null);
      freshnessActions.markUpdated();
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      freshnessActions.markRefreshing(false);
    }
  }, [freshnessActions]);

  // Combine crypto and stock data
  useEffect(() => {
    const combined = {
      ...cryptoPrices,
      ...stockPrices,
    };
    setMarketData(combined);
    
    // Update freshness when we get new data
    const latestUpdate = Math.max(
      cryptoLastUpdated?.getTime() || 0,
      stockLastUpdated?.getTime() || 0
    );
    
    if (latestUpdate > 0) {
      freshnessActions.markUpdated(new Date(latestUpdate));
    }
    
  }, [cryptoPrices, stockPrices, cryptoLastUpdated, stockLastUpdated, freshnessActions]);

  // Handle loading state
  useEffect(() => {
    setIsLoading(cryptoLoading || stockLoading);
  }, [cryptoLoading, stockLoading]);

  // Handle errors
  useEffect(() => {
    const errors = [cryptoError, stockError].filter(Boolean);
    setError(errors.length > 0 ? errors.join('; ') : null);
  }, [cryptoError, stockError]);

  return {
    marketData,
    cryptoPrices,
    stockPrices,
    isLoading,
    error,
    freshness,
    refresh: refreshMarketData,
    lastUpdated: freshness.lastUpdated,
  };
}

// Hook for real-time dashboard data (combines everything)
export function useRealTimeDashboard(config: Partial<RealTimeDataConfig> = {}) {
  const { companies, setCompanies, setNews } = useDATStore();
  const [dashboardData, setDashboardData] = useState({
    companies: [],
    marketData: {},
    news: [],
    metrics: {},
  });

  // Real-time market data
  const {
    marketData,
    isLoading: marketLoading,
    error: marketError,
    freshness: marketFreshness,
    refresh: refreshMarket,
  } = useRealTimeMarketData(config);

  // Company data freshness
  const [companiesFreshness, companiesActions] = useDataFreshness(
    {
      freshThreshold: 300, // 5 minutes for company data
      staleThreshold: 900, // 15 minutes
      autoRefresh: config.autoRefresh ?? true,
    },
    useCallback(async () => {
      await refreshCompanies();
    }, [])
  );

  const refreshCompanies = useCallback(async () => {
    try {
      companiesActions.markRefreshing(true);
      
      const response = await fetch('/api/data/companies');
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCompanies(data);
      companiesActions.markUpdated();
      
    } catch (err) {
      console.error('Failed to refresh companies:', err);
    } finally {
      companiesActions.markRefreshing(false);
    }
  }, [setCompanies, companiesActions]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshCompanies(),
      refreshMarket(),
    ]);
  }, [refreshCompanies, refreshMarket]);

  // Combine all data
  useEffect(() => {
    setDashboardData({
      companies,
      marketData,
      news: [], // Would be populated from real-time news feed
      metrics: {
        totalCompanies: companies.length,
        activeMarkets: Object.keys(marketData).length,
        lastUpdate: new Date(),
      },
    });
  }, [companies, marketData]);

  return {
    data: dashboardData,
    isLoading: marketLoading,
    error: marketError,
    freshness: {
      market: marketFreshness,
      companies: companiesFreshness,
    },
    refresh: refreshAll,
    refreshMarket,
    refreshCompanies,
  };
}

// Integration helper for store updates
export function useStoreIntegration() {
  const { setCompanies, setNews } = useDATStore();
  
  // Subscribe to real-time updates
  const { data: wsData } = useWebSocketData([
    'crypto:BTC', 'crypto:ETH', 'crypto:SOL',
    'stocks:MSTR', 'stocks:DFDV', 'stocks:UPXI', 'stocks:SBET',
    'alerts', 'health'
  ]);

  // Handle WebSocket updates
  useEffect(() => {
    if (wsData) {
      // Update store based on the type of data received
      if (wsData.type === 'data_update' || wsData.type === 'price_update') {
        // Update market data in companies
        setCompanies(prev => prev.map(company => {
          if (company.ticker === wsData.symbol) {
            return {
              ...company,
              marketData: {
                ...company.marketData,
                ...wsData,
                timestamp: new Date().toISOString(),
              },
            };
          }
          return company;
        }));
      }
    }
  }, [wsData, setCompanies]);

  return {
    updateCompanies: setCompanies,
    updateNews: setNews,
  };
}