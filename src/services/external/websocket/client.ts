// WebSocket client for connecting to real-time data feeds
export class WebSocketDataClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private subscriptions: Set<string> = new Set();
  private eventHandlers: Map<string, Function[]> = new Map();
  private isConnecting = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();
          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPing();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (event.code !== 1000) { // Not a normal closure
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          
          if (this.socket?.readyState === WebSocket.CONNECTING) {
            reject(error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    console.log('WebSocket message:', message);

    switch (message.type) {
      case 'connection_status':
        this.emit('connection_status', message.data);
        break;
      
      case 'price_update':
        this.emit('price_update', message.data);
        break;
      
      case 'health_update':
        this.emit('health_update', message.data);
        break;
      
      case 'subscription_result':
        this.emit('subscription_result', message.data);
        break;
      
      case 'error':
        this.emit('error', message.data);
        break;
      
      case 'pong':
        // Handle pong response
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  subscribe(channels: string[]): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to WebSocket server');
    }

    channels.forEach(channel => this.subscriptions.add(channel));

    this.send({
      type: 'subscribe',
      channels,
    });
  }

  unsubscribe(channels: string[]): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to WebSocket server');
    }

    channels.forEach(channel => this.subscriptions.delete(channel));

    this.send({
      type: 'unsubscribe',
      channels,
    });
  }

  getSubscriptions(): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to WebSocket server');
    }

    this.send({
      type: 'get_subscriptions',
    });
  }

  private send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 25000); // Ping every 25 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnect attempts reached');
      this.emit('max_reconnects_reached');
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!this.eventHandlers.has(event)) return;
    
    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.stopPing();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.subscriptions.clear();
    this.reconnectAttempts = 0;
  }

  getStatus(): any {
    return {
      connected: this.isConnected(),
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
      url: this.url,
    };
  }
}

// React hook for using WebSocket client
import React from 'react';

export function useWebSocketData(url: string) {
  const [client, setClient] = React.useState<WebSocketDataClient | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<any>(null);
  const [data, setData] = React.useState<any>({});

  React.useEffect(() => {
    const wsClient = new WebSocketDataClient(url);
    
    wsClient.on('connected', () => {
      setConnected(true);
      setError(null);
    });

    wsClient.on('disconnected', () => {
      setConnected(false);
    });

    wsClient.on('error', (err: Error) => {
      setError(err);
    });

    wsClient.on('price_update', (priceData: any) => {
      setData((prev: any) => ({
        ...prev,
        [`${priceData.symbol}_price`]: priceData,
      }));
    });

    wsClient.on('health_update', (healthData: any) => {
      setData((prev: any) => ({
        ...prev,
        health: healthData,
      }));
    });

    setClient(wsClient);

    // Auto-connect
    wsClient.connect().catch((err) => {
      console.error('Failed to connect to WebSocket:', err);
      setError(err);
    });

    return () => {
      wsClient.disconnect();
    };
  }, [url]);

  const subscribe = React.useCallback((channels: string[]) => {
    if (client && connected) {
      client.subscribe(channels);
    }
  }, [client, connected]);

  const unsubscribe = React.useCallback((channels: string[]) => {
    if (client && connected) {
      client.unsubscribe(channels);
    }
  }, [client, connected]);

  return {
    client,
    connected,
    error,
    data,
    subscribe,
    unsubscribe,
  };
}

export default WebSocketDataClient;