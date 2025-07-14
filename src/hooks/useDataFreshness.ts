import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/services/external/utils/logger';

export interface DataFreshnessConfig {
  freshThreshold: number; // seconds
  staleThreshold: number; // seconds
  updateInterval: number; // milliseconds for checking freshness
  autoRefresh?: boolean;
  maxAge?: number; // maximum age before forcing refresh
}

export interface DataFreshnessState {
  status: 'fresh' | 'stale' | 'expired' | 'unknown';
  lastUpdated: Date | null;
  ageInSeconds: number;
  needsRefresh: boolean;
  isRefreshing: boolean;
}

export interface DataFreshnessActions {
  markUpdated: (timestamp?: Date) => void;
  markRefreshing: (isRefreshing: boolean) => void;
  forceRefresh: () => void;
  reset: () => void;
}

const DEFAULT_CONFIG: DataFreshnessConfig = {
  freshThreshold: 30, // 30 seconds
  staleThreshold: 300, // 5 minutes
  updateInterval: 1000, // 1 second
  autoRefresh: false,
  maxAge: 3600, // 1 hour
};

export function useDataFreshness(
  config: Partial<DataFreshnessConfig> = {},
  onRefreshNeeded?: () => void
): [DataFreshnessState, DataFreshnessActions] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<DataFreshnessState>({
    status: 'unknown',
    lastUpdated: null,
    ageInSeconds: 0,
    needsRefresh: false,
    isRefreshing: false,
  });

  const calculateFreshness = useCallback((lastUpdated: Date | null): DataFreshnessState['status'] => {
    if (!lastUpdated) return 'unknown';
    
    const ageInSeconds = (Date.now() - lastUpdated.getTime()) / 1000;
    
    if (ageInSeconds <= cfg.freshThreshold) {
      return 'fresh';
    } else if (ageInSeconds <= cfg.staleThreshold) {
      return 'stale';
    } else {
      return 'expired';
    }
  }, [cfg.freshThreshold, cfg.staleThreshold]);

  const updateFreshness = useCallback(() => {
    setState(prev => {
      if (!prev.lastUpdated) return prev;
      
      const ageInSeconds = (Date.now() - prev.lastUpdated.getTime()) / 1000;
      const status = calculateFreshness(prev.lastUpdated);
      const needsRefresh = status === 'expired' || 
        (cfg.maxAge && ageInSeconds > cfg.maxAge);
      
      // Trigger refresh if needed and auto-refresh is enabled
      if (needsRefresh && cfg.autoRefresh && !prev.isRefreshing && onRefreshNeeded) {
        onRefreshNeeded();
      }
      
      return {
        ...prev,
        status,
        ageInSeconds,
        needsRefresh,
      };
    });
  }, [calculateFreshness, cfg.maxAge, cfg.autoRefresh, onRefreshNeeded]);

  // Start freshness monitoring
  useEffect(() => {
    intervalRef.current = setInterval(updateFreshness, cfg.updateInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateFreshness, cfg.updateInterval]);

  const markUpdated = useCallback((timestamp?: Date) => {
    const updateTime = timestamp || new Date();
    setState(prev => ({
      ...prev,
      lastUpdated: updateTime,
      status: 'fresh',
      ageInSeconds: 0,
      needsRefresh: false,
      isRefreshing: false,
    }));
    
    logger.debug('DataFreshness', 'Data marked as updated', { timestamp: updateTime });
  }, []);

  const markRefreshing = useCallback((isRefreshing: boolean) => {
    setState(prev => ({ ...prev, isRefreshing }));
    
    if (isRefreshing) {
      // Set a timeout to automatically clear refreshing state
      refreshTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isRefreshing: false }));
        logger.warn('DataFreshness', 'Refresh timeout - clearing refreshing state');
      }, 30000); // 30 seconds
    } else if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const forceRefresh = useCallback(() => {
    if (onRefreshNeeded && !state.isRefreshing) {
      markRefreshing(true);
      onRefreshNeeded();
    }
  }, [onRefreshNeeded, state.isRefreshing, markRefreshing]);

  const reset = useCallback(() => {
    setState({
      status: 'unknown',
      lastUpdated: null,
      ageInSeconds: 0,
      needsRefresh: false,
      isRefreshing: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const actions: DataFreshnessActions = {
    markUpdated,
    markRefreshing,
    forceRefresh,
    reset,
  };

  return [state, actions];
}

// Hook for multiple data sources freshness
export function useMultiDataFreshness(
  sources: Record<string, Partial<DataFreshnessConfig>>,
  onRefreshNeeded?: (source: string) => void
): {
  freshness: Record<string, DataFreshnessState>;
  actions: Record<string, DataFreshnessActions>;
  overallStatus: 'fresh' | 'stale' | 'expired' | 'mixed' | 'unknown';
} {
  const [freshnessStates, setFreshnessStates] = useState<Record<string, DataFreshnessState>>({});
  const [freshnessActions, setFreshnessActions] = useState<Record<string, DataFreshnessActions>>({});

  // Initialize freshness hooks for each source
  useEffect(() => {
    const states: Record<string, DataFreshnessState> = {};
    const actions: Record<string, DataFreshnessActions> = {};

    Object.keys(sources).forEach(sourceKey => {
      // This is a simplified approach - in practice, you'd need to manage multiple hooks
      // For now, we'll create a simplified version
      states[sourceKey] = {
        status: 'unknown',
        lastUpdated: null,
        ageInSeconds: 0,
        needsRefresh: false,
        isRefreshing: false,
      };
      
      actions[sourceKey] = {
        markUpdated: (timestamp?: Date) => {
          setFreshnessStates(prev => ({
            ...prev,
            [sourceKey]: {
              ...prev[sourceKey],
              lastUpdated: timestamp || new Date(),
              status: 'fresh',
              ageInSeconds: 0,
              needsRefresh: false,
              isRefreshing: false,
            },
          }));
        },
        markRefreshing: (isRefreshing: boolean) => {
          setFreshnessStates(prev => ({
            ...prev,
            [sourceKey]: {
              ...prev[sourceKey],
              isRefreshing,
            },
          }));
        },
        forceRefresh: () => {
          if (onRefreshNeeded) {
            onRefreshNeeded(sourceKey);
          }
        },
        reset: () => {
          setFreshnessStates(prev => ({
            ...prev,
            [sourceKey]: {
              status: 'unknown',
              lastUpdated: null,
              ageInSeconds: 0,
              needsRefresh: false,
              isRefreshing: false,
            },
          }));
        },
      };
    });

    setFreshnessStates(states);
    setFreshnessActions(actions);
  }, [sources, onRefreshNeeded]);

  // Calculate overall status
  const overallStatus = Object.values(freshnessStates).reduce((overall, state) => {
    if (overall === 'mixed') return 'mixed';
    if (overall === 'unknown' && state.status !== 'unknown') return state.status;
    if (overall !== state.status && state.status !== 'unknown') return 'mixed';
    return overall;
  }, 'unknown' as 'fresh' | 'stale' | 'expired' | 'mixed' | 'unknown');

  return {
    freshness: freshnessStates,
    actions: freshnessActions,
    overallStatus,
  };
}

// Utility function to format age display
export function formatDataAge(ageInSeconds: number): string {
  if (ageInSeconds < 60) {
    return `${Math.floor(ageInSeconds)}s ago`;
  } else if (ageInSeconds < 3600) {
    return `${Math.floor(ageInSeconds / 60)}m ago`;
  } else if (ageInSeconds < 86400) {
    return `${Math.floor(ageInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(ageInSeconds / 86400)}d ago`;
  }
}

// Utility function to get status color
export function getFreshnessColor(status: DataFreshnessState['status']): string {
  switch (status) {
    case 'fresh':
      return 'text-green-500';
    case 'stale':
      return 'text-yellow-500';
    case 'expired':
      return 'text-red-500';
    case 'unknown':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
}

// Utility function to get status icon
export function getFreshnessIcon(status: DataFreshnessState['status']): string {
  switch (status) {
    case 'fresh':
      return '●'; // Green dot
    case 'stale':
      return '●'; // Yellow dot
    case 'expired':
      return '●'; // Red dot
    case 'unknown':
      return '○'; // Gray circle
    default:
      return '○';
  }
}