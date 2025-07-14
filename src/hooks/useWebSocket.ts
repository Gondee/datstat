import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/services/external/utils/logger';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  channel?: string;
}

export interface WebSocketOptions {
  url?: string;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectAttempt: number;
}

export interface WebSocketActions {
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  joinRoom: (rooms: string[]) => void;
  leaveRoom: (rooms: string[]) => void;
}

const DEFAULT_OPTIONS: WebSocketOptions = {
  url: process.env.NEXT_PUBLIC_WS_URL || '',
  autoReconnect: false, // Disable WebSocket for now since Vercel doesn't support it
  reconnectAttempts: 0,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  debug: false,
};

export function useWebSocket(
  options: WebSocketOptions = {}
): [WebSocketState, WebSocketActions] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueue = useRef<any[]>([]);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempt: 0,
  });

  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    if (opts.debug) {
      console[level](`[WebSocket] ${message}`, data);
    }
    logger[level]('WebSocket Hook', message, data);
  }, [opts.debug]);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (!opts.heartbeatInterval) return;
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
        startHeartbeat(); // Schedule next heartbeat
      }
    }, opts.heartbeatInterval);
  }, [opts.heartbeatInterval]);

  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      const messages = [...messageQueue.current];
      messageQueue.current = [];
      
      messages.forEach(message => {
        ws.current?.send(JSON.stringify(message));
      });
      
      log('info', `Sent ${messages.length} queued messages`);
    }
  }, [log]);

  const connect = useCallback(() => {
    // Skip connection if no URL provided (WebSocket disabled)
    if (!opts.url) {
      log('info', 'WebSocket disabled - no URL provided');
      return;
    }
    
    if (state.isConnecting || state.isConnected) {
      log('warn', 'Already connected or connecting');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    log('info', `Connecting to ${opts.url}`);

    try {
      ws.current = new WebSocket(opts.url);

      ws.current.onopen = () => {
        log('info', 'WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempt: 0,
        }));
        
        startHeartbeat();
        processMessageQueue();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          log('info', `Received message: ${message.type}`, message);
          
          setState(prev => ({ ...prev, lastMessage: message }));
        } catch (error) {
          log('error', 'Failed to parse message', { error, data: event.data });
        }
      };

      ws.current.onclose = (event) => {
        log('info', 'WebSocket closed', { code: event.code, reason: event.reason });
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        
        clearTimeouts();

        // Auto-reconnect if enabled and not a clean close
        if (opts.autoReconnect && event.code !== 1000) {
          const attempt = state.reconnectAttempt + 1;
          if (attempt <= (opts.reconnectAttempts || 0)) {
            log('info', `Attempting reconnect ${attempt}/${opts.reconnectAttempts}`);
            setState(prev => ({ ...prev, reconnectAttempt: attempt }));
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, opts.reconnectInterval);
          } else {
            log('error', 'Max reconnection attempts reached');
            setState(prev => ({
              ...prev,
              error: 'Max reconnection attempts reached',
            }));
          }
        }
      };

      ws.current.onerror = (error) => {
        log('error', 'WebSocket error', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false,
        }));
      };

    } catch (error) {
      log('error', 'Failed to create WebSocket connection', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false,
      }));
    }
  }, [state.isConnecting, state.isConnected, state.reconnectAttempt, opts, log, startHeartbeat, processMessageQueue, clearTimeouts]);

  const disconnect = useCallback(() => {
    log('info', 'Disconnecting WebSocket');
    clearTimeouts();
    
    if (ws.current) {
      ws.current.close(1000, 'User disconnect');
      ws.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempt: 0,
    }));
  }, [log, clearTimeouts]);

  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      log('info', `Sent message: ${message.type}`, message);
    } else {
      log('warn', 'WebSocket not connected, queuing message', message);
      messageQueue.current.push(message);
    }
  }, [log]);

  const subscribe = useCallback((channels: string[]) => {
    send({
      type: 'subscribe',
      channels,
    });
  }, [send]);

  const unsubscribe = useCallback((channels: string[]) => {
    send({
      type: 'unsubscribe',
      channels,
    });
  }, [send]);

  const joinRoom = useCallback((rooms: string[]) => {
    send({
      type: 'join_room',
      rooms,
    });
  }, [send]);

  const leaveRoom = useCallback((rooms: string[]) => {
    send({
      type: 'leave_room',
      rooms,
    });
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (ws.current) {
        ws.current.close(1000, 'Component unmount');
      }
    };
  }, [clearTimeouts]);

  const actions: WebSocketActions = {
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
  };

  return [state, actions];
}

// Hook for specific data subscriptions
export function useWebSocketData<T = any>(
  channels: string[],
  options?: WebSocketOptions
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  subscribe: (additionalChannels: string[]) => void;
  unsubscribe: (channelsToRemove: string[]) => void;
} {
  const [wsState, wsActions] = useWebSocket(options);
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());

  // Auto-connect and subscribe on mount
  useEffect(() => {
    // Only connect if a URL is provided
    if (options?.url || process.env.NEXT_PUBLIC_WS_URL) {
      wsActions.connect();
    }
    
    return () => {
      wsActions.disconnect();
    };
  }, [wsActions, options?.url]);

  // Subscribe to initial channels
  useEffect(() => {
    if (wsState.isConnected && channels.length > 0) {
      const newChannels = channels.filter(ch => !subscribedChannels.current.has(ch));
      if (newChannels.length > 0) {
        wsActions.subscribe(newChannels);
        newChannels.forEach(ch => subscribedChannels.current.add(ch));
      }
    }
  }, [wsState.isConnected, channels, wsActions]);

  // Handle incoming messages
  useEffect(() => {
    if (wsState.lastMessage) {
      const { type, data: messageData, channel } = wsState.lastMessage;
      
      if (type === 'data_update' || type === 'price_update') {
        if (!channel || subscribedChannels.current.has(channel)) {
          setData(messageData as T);
          setLastUpdated(new Date());
        }
      }
    }
  }, [wsState.lastMessage]);

  const subscribe = useCallback((additionalChannels: string[]) => {
    const newChannels = additionalChannels.filter(ch => !subscribedChannels.current.has(ch));
    if (newChannels.length > 0) {
      wsActions.subscribe(newChannels);
      newChannels.forEach(ch => subscribedChannels.current.add(ch));
    }
  }, [wsActions]);

  const unsubscribe = useCallback((channelsToRemove: string[]) => {
    const existingChannels = channelsToRemove.filter(ch => subscribedChannels.current.has(ch));
    if (existingChannels.length > 0) {
      wsActions.unsubscribe(existingChannels);
      existingChannels.forEach(ch => subscribedChannels.current.delete(ch));
    }
  }, [wsActions]);

  return {
    data,
    isLoading: wsState.isConnecting,
    error: wsState.error,
    lastUpdated,
    subscribe,
    unsubscribe,
  };
}

// Hook for real-time price updates
export function useRealTimePrices(
  symbols: string[],
  type: 'crypto' | 'stocks' = 'crypto'
): {
  prices: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
} {
  const channels = symbols.map(symbol => `${type}:${symbol}`);
  const { data, isLoading, error, lastUpdated } = useWebSocketData(channels);
  const [prices, setPrices] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data && data.symbol) {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: data,
      }));
    }
  }, [data]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
  };
}

// Hook for connection status monitoring
export function useWebSocketStatus(options?: WebSocketOptions) {
  const [wsState, wsActions] = useWebSocket(options);
  
  useEffect(() => {
    // Only connect if a URL is provided
    if (options?.url || process.env.NEXT_PUBLIC_WS_URL) {
      wsActions.connect();
    }
    
    return () => {
      wsActions.disconnect();
    };
  }, [wsActions, options?.url]);

  return {
    isConnected: wsState.isConnected,
    isConnecting: wsState.isConnecting,
    error: wsState.error,
    reconnectAttempt: wsState.reconnectAttempt,
    connect: wsActions.connect,
    disconnect: wsActions.disconnect,
  };
}