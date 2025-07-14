import { useState, useEffect, useCallback, useRef } from 'react';
import { CompanyWithMetrics } from '@/types';

interface AnalyticsCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

interface UseAnalyticsDataOptions {
  cacheTime?: number; // Cache duration in milliseconds
  refetchInterval?: number; // Auto-refetch interval in milliseconds
  enabled?: boolean; // Whether to fetch data
}

export function useAnalyticsData<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options: UseAnalyticsDataOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    refetchInterval,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<AnalyticsCache>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key from dependencies
  const cacheKey = JSON.stringify(deps);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      
      // Update cache
      cacheRef.current[cacheKey] = {
        data: result,
        timestamp: Date.now(),
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, cacheKey, cacheTime, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refetch interval if specified
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData, refetchInterval, enabled]);

  const refetch = useCallback(() => {
    // Clear cache for this key
    delete cacheRef.current[cacheKey];
    return fetchData();
  }, [cacheKey, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// Specific hooks for different analytics data
export function useCompanyAnalytics(ticker: string) {
  return useAnalyticsData(
    async () => {
      const response = await fetch(`/api/analytics/comprehensive/${ticker}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      return data.data;
    },
    [ticker],
    { cacheTime: 10 * 60 * 1000 } // 10 minutes cache
  );
}

export function useHistoricalData(
  ticker: string,
  timeRange: string = '30d'
) {
  return useAnalyticsData(
    async () => {
      const response = await fetch(
        `/api/data/companies/${ticker}/historical?timeRange=${timeRange}`
      );
      if (!response.ok) throw new Error('Failed to fetch historical data');
      const data = await response.json();
      return data.data;
    },
    [ticker, timeRange],
    { cacheTime: 15 * 60 * 1000 } // 15 minutes cache
  );
}

export function useRiskMetrics(ticker: string) {
  return useAnalyticsData(
    async () => {
      const response = await fetch(`/api/analytics/risk/${ticker}`);
      if (!response.ok) throw new Error('Failed to fetch risk metrics');
      const data = await response.json();
      return data.data;
    },
    [ticker],
    { cacheTime: 30 * 60 * 1000 } // 30 minutes cache
  );
}

export function useYieldAnalytics(ticker: string) {
  return useAnalyticsData(
    async () => {
      const response = await fetch(`/api/analytics/yield/${ticker}`);
      if (!response.ok) throw new Error('Failed to fetch yield analytics');
      const data = await response.json();
      return data.data;
    },
    [ticker],
    { cacheTime: 60 * 60 * 1000 } // 1 hour cache
  );
}