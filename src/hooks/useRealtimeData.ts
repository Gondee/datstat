// Real-time data management hooks for DAT Analytics Platform
import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../state/store';
import { WS_ENDPOINTS } from '../api/routes';
import { CryptoType } from '../types/models';

interface WebSocketMessage {
  type: 'price_update' | 'company_update' | 'transaction' | 'alert';
  data: any;
  timestamp: Date;
}

interface PriceUpdate {
  symbol: CryptoType | string;
  price: number;
  change24h: number;
  volume: number;
}

interface CompanyUpdate {
  ticker: string;
  stockPrice?: number;
  treasuryUpdate?: {
    cryptoType: CryptoType;
    amount: number;
    transaction?: any;
  };
}

// Custom hook for real-time market data
export function useRealtimeMarketData(symbols?: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const { 
    setConnectionStatus, 
    updateCryptoPrice,
    updateCompany 
  } = useAppStore();

  const connect = useCallback(() => {
    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}${WS_ENDPOINTS.marketData}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus(true);
        reconnectAttemptsRef.current = 0;

        // Subscribe to specific symbols if provided
        if (symbols?.length) {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'price_update':
              const priceData = message.data as PriceUpdate;
              updateCryptoPrice(priceData.symbol as CryptoType, priceData.price);
              break;
              
            case 'company_update':
              const companyData = message.data as CompanyUpdate;
              updateCompany(companyData.ticker, {
                stockPrice: companyData.stockPrice ? {
                  ...useAppStore.getState().companies.find(c => c.ticker === companyData.ticker)?.stockPrice!,
                  current: companyData.stockPrice,
                  lastUpdated: new Date()
                } : undefined
              });
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus(false);
        
        // Exponential backoff for reconnection
        const attempts = reconnectAttemptsRef.current;
        if (attempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus(false);
    }
  }, [symbols, setConnectionStatus, updateCryptoPrice, updateCompany]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Public methods
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected: useAppStore(state => state.isConnected),
    sendMessage,
    reconnect: connect,
    disconnect
  };
}

// Custom hook for polling data updates
export function useDataPolling(
  fetchFunction: () => Promise<void>,
  interval: number = 30000, // Default 30 seconds
  enabled: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchFunction();

    // Set up polling
    intervalRef.current = setInterval(fetchFunction, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchFunction, interval, enabled]);
}

// Custom hook for managing data freshness
export function useDataFreshness(maxAge: number = 300000) { // Default 5 minutes
  const lastUpdate = useAppStore(state => state.lastUpdate);
  
  const isStale = useCallback(() => {
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate.getTime() > maxAge;
  }, [lastUpdate, maxAge]);

  const timeSinceUpdate = useCallback(() => {
    if (!lastUpdate) return null;
    return Date.now() - lastUpdate.getTime();
  }, [lastUpdate]);

  const formatTimeSince = useCallback(() => {
    const time = timeSinceUpdate();
    if (!time) return 'Never';
    
    if (time < 60000) return 'Just now';
    if (time < 3600000) return `${Math.floor(time / 60000)} minutes ago`;
    if (time < 86400000) return `${Math.floor(time / 3600000)} hours ago`;
    return `${Math.floor(time / 86400000)} days ago`;
  }, [timeSinceUpdate]);

  return {
    isStale: isStale(),
    timeSinceUpdate: timeSinceUpdate(),
    formatTimeSince: formatTimeSince(),
    lastUpdate
  };
}

// Custom hook for batch updates
export function useBatchUpdates() {
  const updateQueueRef = useRef<Map<string, any>>(new Map());
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { updateCompany } = useAppStore();

  const flushUpdates = useCallback(() => {
    const updates = Array.from(updateQueueRef.current.entries());
    updateQueueRef.current.clear();
    
    // Apply all updates
    updates.forEach(([ticker, update]) => {
      updateCompany(ticker, update);
    });
  }, [updateCompany]);

  const queueUpdate = useCallback((ticker: string, update: any) => {
    // Merge with existing update if present
    const existing = updateQueueRef.current.get(ticker) || {};
    updateQueueRef.current.set(ticker, { ...existing, ...update });
    
    // Debounce flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    flushTimeoutRef.current = setTimeout(flushUpdates, 100);
  }, [flushUpdates]);

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushUpdates();
      }
    };
  }, [flushUpdates]);

  return { queueUpdate, flushUpdates };
}