import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { logger } from '../utils/logger';
import { dataIntegrationService } from '../dataIntegration';
import { coinGeckoService } from '../apis/coinGeckoService';
import { alphaVantageService } from '../apis/alphaVantageService';
import { WebSocketMessage } from '../types';
import { CryptoType } from '@/types/models';
import { dataProcessor } from '../../pipeline/dataProcessor';
import { jobScheduler } from '../../pipeline/jobScheduler';
import EventEmitter from 'events';
import { 
  WebSocketMessageBatcher, 
  WebSocketConnectionPool, 
  SmartReconnectionManager,
  DataThrottler 
} from '@/lib/performance/websocket-optimization';

interface ClientConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  rooms: Set<string>;
  lastPing: number;
  isAlive: boolean;
  metadata: {
    userAgent?: string;
    connectedAt: Date;
    totalMessages: number;
    lastActivity: Date;
  };
}

interface SubscriptionRequest {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
  rooms?: string[];
}

interface RoomJoinRequest {
  type: 'join_room' | 'leave_room';
  rooms: string[];
}

interface BroadcastOptions {
  excludeClient?: string;
  includeRooms?: string[];
  excludeRooms?: string[];
  priority?: 'low' | 'medium' | 'high';
}

class WebSocketDataServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private server: any = null;
  private clients: Map<string, ClientConnection> = new Map();
  private rooms: Map<string, Set<string>> = new Map(); // room -> client IDs
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> client IDs
  private messageQueue: Map<string, any[]> = new Map(); // priority queues
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private queueProcessInterval: NodeJS.Timeout | null = null;
  private port: number;
  private isRunning = false;
  private stats = {
    totalConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    errors: 0,
  };
  
  // Performance optimization instances
  private messageBatcher: WebSocketMessageBatcher;
  private connectionPool: WebSocketConnectionPool;
  private reconnectionManager: SmartReconnectionManager;
  private dataThrottler: DataThrottler;

  constructor(port: number = 8080) {
    super();
    this.port = port;
    this.initializeMessageQueues();
    this.setupDataProcessorListeners();
    this.setupJobSchedulerListeners();
    
    // Initialize performance optimizations
    this.messageBatcher = new WebSocketMessageBatcher(
      (messages) => this.sendBatchedMessages(messages),
      50, // batch size
      100 // batch delay ms
    );
    this.connectionPool = new WebSocketConnectionPool(1000, 300000); // 1000 max connections, 5 min idle timeout
    this.reconnectionManager = new SmartReconnectionManager(5, 1000, 30000);
    this.dataThrottler = new DataThrottler(1000, 0.01); // 1s throttle, 1% change threshold
  }

  private initializeMessageQueues(): void {
    this.messageQueue.set('high', []);
    this.messageQueue.set('medium', []);
    this.messageQueue.set('low', []);
  }

  private setupDataProcessorListeners(): void {
    dataProcessor.on('dataProcessed', (event) => {
      this.broadcastDataUpdate(event);
    });

    dataProcessor.on('significantChange', (event) => {
      this.broadcastSignificantChange(event);
    });
  }

  private setupJobSchedulerListeners(): void {
    jobScheduler.on('jobCompleted', (event) => {
      this.broadcastJobStatus(event);
    });

    jobScheduler.on('jobFailed', (event) => {
      this.broadcastJobStatus(event);
    });
  }

  private broadcastDataUpdate(event: any): void {
    const { type, symbol, ticker, processed } = event;
    const channel = type === 'crypto' ? `crypto:${symbol}` : `stocks:${ticker}`;
    const key = `${channel}:update`;
    
    // Check if we should throttle this update
    const shouldSend = this.dataThrottler.shouldSendUpdate(
      key,
      processed.validated,
      ['price'] // Always send on price changes
    );
    
    if (shouldSend) {
      this.messageBatcher.addMessage(channel, {
        type: 'data_update',
        data: {
          type,
          symbol: symbol || ticker,
          ...processed.validated,
          derivedMetrics: processed.derivedMetrics,
          lastUpdated: processed.timestamp,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private broadcastSignificantChange(event: any): void {
    const { type, symbol, ticker, changes } = event;
    const channel = type === 'crypto' ? `crypto:${symbol}` : `stocks:${ticker}`;
    
    this.queueMessage({
      type: 'significant_change',
      channel,
      data: {
        type,
        symbol: symbol || ticker,
        changes: changes.changes,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }, 'high');

    // Also broadcast to alert room
    this.broadcastToRoom('alerts', {
      type: 'price_alert',
      data: {
        type,
        symbol: symbol || ticker,
        changes: changes.changes,
        severity: changes.significantChange ? 'high' : 'medium',
      },
      timestamp: new Date().toISOString(),
    });
  }

  private broadcastJobStatus(event: any): void {
    this.broadcastToRoom('admin', {
      type: 'job_status',
      data: event,
      timestamp: new Date().toISOString(),
    });
  }

  private queueMessage(message: any, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    const queue = this.messageQueue.get(priority);
    if (queue) {
      queue.push(message);
    }
  }

  private processMessageQueue(): void {
    // Process high priority first, then medium, then low
    const priorities = ['high', 'medium', 'low'] as const;
    
    for (const priority of priorities) {
      const queue = this.messageQueue.get(priority);
      if (queue && queue.length > 0) {
        const message = queue.shift();
        if (message) {
          this.broadcastToChannel(message.channel, message);
        }
        break; // Process one message per cycle
      }
    }
  }

  private startQueueProcessor(): void {
    this.queueProcessInterval = setInterval(() => {
      this.processMessageQueue();
    }, 100); // Process queue every 100ms
  }

  private stopQueueProcessor(): void {
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
      this.queueProcessInterval = null;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('WebSocket', 'Server already running');
      return;
    }

    try {
      // Create HTTP server for WebSocket upgrade
      this.server = createServer();
      
      // Create WebSocket server
      this.wss = new WebSocketServer({ 
        server: this.server,
        path: '/ws/data',
        perMessageDeflate: false,
      });

      this.setupWebSocketServer();
      this.startPriceUpdates();
      this.startHeartbeat();
      this.startQueueProcessor();

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, (error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.isRunning = true;
      logger.info('WebSocket', `Server started on port ${this.port}`);
    } catch (error) {
      logger.error('WebSocket', 'Failed to start server', error as Error);
      throw error;
    }
  }

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (socket: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        id: clientId,
        socket,
        subscriptions: new Set(),
        rooms: new Set(),
        lastPing: Date.now(),
        isAlive: true,
        metadata: {
          userAgent: request.headers['user-agent'],
          connectedAt: new Date(),
          totalMessages: 0,
          lastActivity: new Date(),
        },
      };

      // Add to connection pool
      const added = this.connectionPool.addConnection(clientId, socket);
      if (!added) {
        socket.close(1008, 'Connection pool full');
        return;
      }
      
      this.clients.set(clientId, client);
      logger.info('WebSocket', `Client connected: ${clientId}`, {
        totalClients: this.clients.size,
        userAgent: request.headers['user-agent'],
        poolStats: this.connectionPool.getPoolStats()
      });

      // Setup client event handlers
      this.setupClientHandlers(client);

      // Send welcome message
      this.sendToClient(client, {
        type: 'connection_status',
        data: {
          clientId,
          status: 'connected',
          availableChannels: [
            'crypto:BTC',
            'crypto:ETH', 
            'crypto:SOL',
            'stocks:MSTR',
            'stocks:DFDV',
            'stocks:UPXI',
            'stocks:SBET',
            'health',
            'alerts',
            'jobs',
          ],
          availableRooms: [
            'general',
            'crypto',
            'stocks',
            'alerts',
            'admin',
            'company:MSTR',
            'company:DFDV',
            'company:UPXI',
            'company:SBET',
          ],
        },
        timestamp: new Date().toISOString(),
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket', 'Server error', error);
    });
  }

  private setupClientHandlers(client: ClientConnection): void {
    client.socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(client, message);
      } catch (error) {
        logger.warn('WebSocket', `Invalid message from client ${client.id}`, {
          error: (error as Error).message,
        });
        this.sendToClient(client, {
          type: 'error',
          data: { message: 'Invalid JSON message' },
          timestamp: new Date().toISOString(),
        });
      }
    });

    client.socket.on('pong', () => {
      client.isAlive = true;
      client.lastPing = Date.now();
    });

    client.socket.on('close', (code, reason) => {
      logger.info('WebSocket', `Client disconnected: ${client.id}`, {
        code,
        reason: reason.toString(),
        totalClients: this.clients.size - 1,
      });
      this.clients.delete(client.id);
      this.connectionPool.removeConnection(client.id);
      this.reconnectionManager.cleanup(client.id);
      
      // Clean up subscriptions
      for (const channel of client.subscriptions) {
        this.removeClientFromChannel(client.id, channel);
      }
      for (const room of client.rooms) {
        this.removeClientFromRoom(client.id, room);
      }
    });

    client.socket.on('error', (error) => {
      logger.error('WebSocket', `Client error: ${client.id}`, error);
      this.clients.delete(client.id);
    });
  }

  private handleClientMessage(client: ClientConnection, message: any): void {
    client.metadata.totalMessages++;
    client.metadata.lastActivity = new Date();
    
    logger.debug('WebSocket', `Message from client ${client.id}`, { message });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(client, message as SubscriptionRequest);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscription(client, message as SubscriptionRequest);
        break;
      
      case 'join_room':
        this.handleRoomJoin(client, message as RoomJoinRequest);
        break;
      
      case 'leave_room':
        this.handleRoomLeave(client, message as RoomJoinRequest);
        break;
      
      case 'ping':
        this.sendToClient(client, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
        });
        break;
      
      case 'get_subscriptions':
        this.sendToClient(client, {
          type: 'subscriptions',
          data: {
            channels: Array.from(client.subscriptions),
            rooms: Array.from(client.rooms),
          },
          timestamp: new Date().toISOString(),
        });
        break;
      
      case 'get_stats':
        this.sendToClient(client, {
          type: 'client_stats',
          data: {
            ...client.metadata,
            subscriptions: client.subscriptions.size,
            rooms: client.rooms.size,
          },
          timestamp: new Date().toISOString(),
        });
        break;
      
      default:
        this.sendToClient(client, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: new Date().toISOString(),
        });
    }
  }

  private handleSubscription(client: ClientConnection, request: SubscriptionRequest): void {
    const { channels } = request;
    const added: string[] = [];
    const invalid: string[] = [];

    for (const channel of channels) {
      if (this.isValidChannel(channel)) {
        client.subscriptions.add(channel);
        this.addClientToChannel(client.id, channel);
        added.push(channel);
      } else {
        invalid.push(channel);
      }
    }

    logger.info('WebSocket', `Client ${client.id} subscribed to channels`, {
      added,
      invalid,
      totalSubscriptions: client.subscriptions.size,
    });

    this.sendToClient(client, {
      type: 'subscription_result',
      data: {
        action: 'subscribe',
        added,
        invalid,
        current: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private handleUnsubscription(client: ClientConnection, request: SubscriptionRequest): void {
    const { channels } = request;
    const removed: string[] = [];

    for (const channel of channels) {
      if (client.subscriptions.has(channel)) {
        client.subscriptions.delete(channel);
        this.removeClientFromChannel(client.id, channel);
        removed.push(channel);
      }
    }

    logger.info('WebSocket', `Client ${client.id} unsubscribed from channels`, {
      removed,
      totalSubscriptions: client.subscriptions.size,
    });

    this.sendToClient(client, {
      type: 'subscription_result',
      data: {
        action: 'unsubscribe',
        removed,
        current: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private handleRoomJoin(client: ClientConnection, request: RoomJoinRequest): void {
    const { rooms } = request;
    const joined: string[] = [];
    const invalid: string[] = [];

    for (const room of rooms) {
      if (this.isValidRoom(room)) {
        client.rooms.add(room);
        this.addClientToRoom(client.id, room);
        joined.push(room);
      } else {
        invalid.push(room);
      }
    }

    logger.info('WebSocket', `Client ${client.id} joined rooms`, {
      joined,
      invalid,
      totalRooms: client.rooms.size,
    });

    this.sendToClient(client, {
      type: 'room_result',
      data: {
        action: 'join',
        joined,
        invalid,
        current: Array.from(client.rooms),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private handleRoomLeave(client: ClientConnection, request: RoomJoinRequest): void {
    const { rooms } = request;
    const left: string[] = [];

    for (const room of rooms) {
      if (client.rooms.has(room)) {
        client.rooms.delete(room);
        this.removeClientFromRoom(client.id, room);
        left.push(room);
      }
    }

    logger.info('WebSocket', `Client ${client.id} left rooms`, {
      left,
      totalRooms: client.rooms.size,
    });

    this.sendToClient(client, {
      type: 'room_result',
      data: {
        action: 'leave',
        left,
        current: Array.from(client.rooms),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private isValidChannel(channel: string): boolean {
    const validChannels = [
      'crypto:BTC', 'crypto:ETH', 'crypto:SOL',
      'stocks:MSTR', 'stocks:DFDV', 'stocks:UPXI', 'stocks:SBET',
      'health', 'alerts', 'jobs',
    ];
    return validChannels.includes(channel);
  }

  private isValidRoom(room: string): boolean {
    const validRooms = [
      'general', 'crypto', 'stocks', 'alerts', 'admin',
      'company:MSTR', 'company:DFDV', 'company:UPXI', 'company:SBET',
    ];
    return validRooms.includes(room);
  }

  private addClientToChannel(clientId: string, channel: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(clientId);
  }

  private removeClientFromChannel(clientId: string, channel: string): void {
    const clients = this.subscriptions.get(channel);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.subscriptions.delete(channel);
      }
    }
  }

  private addClientToRoom(clientId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);
  }

  private removeClientFromRoom(clientId: string, room: string): void {
    const clients = this.rooms.get(room);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  private broadcastToChannel(channel: string, message: WebSocketMessage): void {
    const clients = this.subscriptions.get(channel);
    if (!clients) return;

    let sentCount = 0;
    clients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
        sentCount++;
      }
    });

    this.stats.totalBroadcasts++;
    if (sentCount > 0) {
      logger.debug('WebSocket', `Broadcasted to channel ${channel}`, {
        recipients: sentCount,
        totalClients: this.clients.size,
      });
    }
  }

  private broadcastToRoom(room: string, message: WebSocketMessage): void {
    const clients = this.rooms.get(room);
    if (!clients) return;

    let sentCount = 0;
    clients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
        sentCount++;
      }
    });

    this.stats.totalBroadcasts++;
    if (sentCount > 0) {
      logger.debug('WebSocket', `Broadcasted to room ${room}`, {
        recipients: sentCount,
        totalClients: this.clients.size,
      });
    }
  }

  private startPriceUpdates(): void {
    // Update prices every 30 seconds
    this.priceUpdateInterval = setInterval(async () => {
      await this.broadcastPriceUpdates();
    }, 30000);

    // Initial price broadcast
    setTimeout(() => {
      this.broadcastPriceUpdates();
    }, 5000);
  }

  private async broadcastPriceUpdates(): Promise<void> {
    try {
      // Get crypto prices
      const cryptoResult = await coinGeckoService.getAllCryptoPrices();
      
      for (const [symbol, price] of Object.entries(cryptoResult.data)) {
        const channel = `crypto:${symbol}`;
        this.broadcast(channel, {
          type: 'price_update',
          data: {
            symbol,
            ...price,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get stock prices (less frequent due to rate limits)
      if (Date.now() % 120000 < 30000) { // Every 2 minutes
        try {
          const stockResult = await alphaVantageService.getMultipleStockQuotes(['MSTR', 'DFDV', 'UPXI', 'SBET']);
          
          for (const [symbol, marketData] of Object.entries(stockResult.data)) {
            const channel = `stocks:${symbol}`;
            this.broadcast(channel, {
              type: 'price_update',
              data: {
                symbol,
                ...marketData,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.warn('WebSocket', 'Failed to fetch stock prices for broadcast', {
            error: (error as Error).message,
          });
        }
      }

      // Broadcast health status
      this.broadcast('health', {
        type: 'health_update',
        data: await dataIntegrationService.getDataSourceHealth(),
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('WebSocket', 'Failed to broadcast price updates', error as Error);
    }
  }

  private startHeartbeat(): void {
    // Ping clients every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          logger.info('WebSocket', `Terminating unresponsive client: ${client.id}`);
          client.socket.terminate();
          this.clients.delete(client.id);
          return;
        }

        client.isAlive = false;
        client.socket.ping();
      });
    }, 30000);
  }

  private broadcast(channel: string, message: WebSocketMessage): void {
    this.broadcastToChannel(channel, message);
  }

  private sendToClient(client: ClientConnection, message: WebSocketMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        client.socket.send(messageStr);
        this.stats.totalMessages++;
        
        // Update connection pool stats
        this.connectionPool.updateStats(client.id, 'sent', messageStr.length);
      } catch (error) {
        this.stats.errors++;
        logger.warn('WebSocket', `Failed to send message to client ${client.id}`, {
          error: (error as Error).message,
        });
      }
    }
  }
  
  private sendBatchedMessages(messages: any[]): void {
    for (const batch of messages) {
      this.broadcastToChannel(batch.channel, batch);
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionStats(): any {
    const subscriptionCounts: Record<string, number> = {};
    const roomCounts: Record<string, number> = {};
    
    this.clients.forEach((client) => {
      client.subscriptions.forEach((channel) => {
        subscriptionCounts[channel] = (subscriptionCounts[channel] || 0) + 1;
      });
      
      client.rooms.forEach((room) => {
        roomCounts[room] = (roomCounts[room] || 0) + 1;
      });
    });

    return {
      totalClients: this.clients.size,
      subscriptionCounts,
      roomCounts,
      messageQueueSizes: {
        high: this.messageQueue.get('high')?.length || 0,
        medium: this.messageQueue.get('medium')?.length || 0,
        low: this.messageQueue.get('low')?.length || 0,
      },
      stats: this.stats,
      isRunning: this.isRunning,
      port: this.port,
      uptime: process.uptime(),
      performance: {
        connectionPool: this.connectionPool.getPoolStats(),
        throttling: this.dataThrottler.getThrottleStats(),
        avgMessageSize: this.stats.totalMessages > 0 ? 
          this.connectionPool.getPoolStats().connectionStats
            .reduce((sum, s) => sum + s.bytessSent, 0) / this.stats.totalMessages : 0
      }
    };
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('WebSocket', 'Stopping server');

    // Clear intervals
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.stopQueueProcessor();
    
    // Flush any pending messages
    this.messageBatcher.flushAll();
    
    // Clear performance optimization resources
    this.dataThrottler.clear();

    // Close all client connections
    this.clients.forEach((client) => {
      client.socket.close(1000, 'Server shutting down');
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          resolve();
        });
      });
    }

    this.isRunning = false;
    logger.info('WebSocket', 'Server stopped');
  }
}

export default WebSocketDataServer;