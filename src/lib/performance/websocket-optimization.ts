import { WebSocket } from 'ws';
import { logger } from '@/services/external/utils/logger';

// Message batching for WebSocket
export class WebSocketMessageBatcher {
  private messageQueue: Map<string, any[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private batchDelay: number;
  private sendFunction: (messages: any[]) => void;

  constructor(
    sendFunction: (messages: any[]) => void,
    batchSize: number = 50,
    batchDelay: number = 100
  ) {
    this.sendFunction = sendFunction;
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  addMessage(channel: string, message: any): void {
    if (!this.messageQueue.has(channel)) {
      this.messageQueue.set(channel, []);
    }
    
    const queue = this.messageQueue.get(channel)!;
    queue.push(message);
    
    if (queue.length >= this.batchSize) {
      this.flushChannel(channel);
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushAll();
      }, this.batchDelay);
    }
  }

  private flushChannel(channel: string): void {
    const messages = this.messageQueue.get(channel);
    if (!messages || messages.length === 0) return;
    
    this.sendFunction([{
      type: 'batch',
      channel,
      messages,
      timestamp: new Date().toISOString()
    }]);
    
    this.messageQueue.set(channel, []);
  }

  flushAll(): void {
    const allMessages: any[] = [];
    
    for (const [channel, messages] of this.messageQueue) {
      if (messages.length > 0) {
        allMessages.push({
          type: 'batch',
          channel,
          messages,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (allMessages.length > 0) {
      this.sendFunction(allMessages);
    }
    
    this.messageQueue.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  clear(): void {
    this.messageQueue.clear();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Connection pool for WebSocket clients
export class WebSocketConnectionPool {
  private connections: Map<string, WebSocket> = new Map();
  private connectionStats: Map<string, {
    messagesSent: number;
    messagesReceived: number;
    bytessSent: number;
    bytesReceived: number;
    connectedAt: Date;
    lastActivity: Date;
  }> = new Map();
  
  private maxConnections: number;
  private idleTimeout: number;

  constructor(maxConnections: number = 1000, idleTimeout: number = 300000) {
    this.maxConnections = maxConnections;
    this.idleTimeout = idleTimeout;
    
    // Periodic cleanup of idle connections
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000);
  }

  addConnection(id: string, socket: WebSocket): boolean {
    if (this.connections.size >= this.maxConnections) {
      // Remove oldest idle connection
      const oldestIdle = this.findOldestIdleConnection();
      if (oldestIdle) {
        this.removeConnection(oldestIdle);
      } else {
        return false;
      }
    }
    
    this.connections.set(id, socket);
    this.connectionStats.set(id, {
      messagesSent: 0,
      messagesReceived: 0,
      bytessSent: 0,
      bytesReceived: 0,
      connectedAt: new Date(),
      lastActivity: new Date()
    });
    
    return true;
  }

  removeConnection(id: string): void {
    const socket = this.connections.get(id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    this.connections.delete(id);
    this.connectionStats.delete(id);
  }

  getConnection(id: string): WebSocket | undefined {
    return this.connections.get(id);
  }

  updateStats(
    id: string,
    type: 'sent' | 'received',
    messageSize: number
  ): void {
    const stats = this.connectionStats.get(id);
    if (!stats) return;
    
    stats.lastActivity = new Date();
    
    if (type === 'sent') {
      stats.messagesSent++;
      stats.bytessSent += messageSize;
    } else {
      stats.messagesReceived++;
      stats.bytesReceived += messageSize;
    }
  }

  private findOldestIdleConnection(): string | null {
    const now = Date.now();
    let oldestId: string | null = null;
    let oldestTime = now;
    
    for (const [id, stats] of this.connectionStats) {
      const idleTime = now - stats.lastActivity.getTime();
      if (idleTime > this.idleTimeout && stats.lastActivity.getTime() < oldestTime) {
        oldestTime = stats.lastActivity.getTime();
        oldestId = id;
      }
    }
    
    return oldestId;
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [id, stats] of this.connectionStats) {
      const idleTime = now - stats.lastActivity.getTime();
      if (idleTime > this.idleTimeout) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      logger.info('WebSocket', `Removing idle connection: ${id}`);
      this.removeConnection(id);
    }
  }

  getPoolStats() {
    const stats = {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      utilizationPercent: (this.connections.size / this.maxConnections) * 100,
      connectionStats: Array.from(this.connectionStats.entries()).map(([id, stats]) => ({
        id,
        ...stats,
        idleTime: Date.now() - stats.lastActivity.getTime()
      }))
    };
    
    return stats;
  }
}

// Smart reconnection strategy
export class SmartReconnectionManager {
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(
    maxRetries: number = 5,
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  scheduleReconnect(
    clientId: string,
    reconnectFn: () => Promise<void>
  ): void {
    const attempts = this.reconnectAttempts.get(clientId) || 0;
    
    if (attempts >= this.maxRetries) {
      logger.error('WebSocket', `Max reconnection attempts reached for client ${clientId}`);
      this.cleanup(clientId);
      return;
    }
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attempts) + Math.random() * 1000,
      this.maxDelay
    );
    
    logger.info('WebSocket', `Scheduling reconnect for client ${clientId}`, {
      attempt: attempts + 1,
      delay
    });
    
    const timeout = setTimeout(async () => {
      try {
        await reconnectFn();
        this.cleanup(clientId);
      } catch (error) {
        this.reconnectAttempts.set(clientId, attempts + 1);
        this.scheduleReconnect(clientId, reconnectFn);
      }
    }, delay);
    
    this.reconnectTimeouts.set(clientId, timeout);
  }

  cleanup(clientId: string): void {
    this.reconnectAttempts.delete(clientId);
    
    const timeout = this.reconnectTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(clientId);
    }
  }

  resetAttempts(clientId: string): void {
    this.reconnectAttempts.delete(clientId);
  }
}

// Data throttling for real-time updates
export class DataThrottler {
  private lastSentData = new Map<string, any>();
  private lastSentTime = new Map<string, number>();
  private throttleInterval: number;
  private significantChangeThreshold: number;

  constructor(
    throttleInterval: number = 1000,
    significantChangeThreshold: number = 0.01 // 1%
  ) {
    this.throttleInterval = throttleInterval;
    this.significantChangeThreshold = significantChangeThreshold;
  }

  shouldSendUpdate(
    key: string,
    newData: any,
    forceFields?: string[]
  ): boolean {
    const now = Date.now();
    const lastTime = this.lastSentTime.get(key) || 0;
    const timeSinceLastUpdate = now - lastTime;
    
    // Always send if enough time has passed
    if (timeSinceLastUpdate >= this.throttleInterval) {
      this.updateLastSent(key, newData, now);
      return true;
    }
    
    // Check for significant changes
    const lastData = this.lastSentData.get(key);
    if (!lastData) {
      this.updateLastSent(key, newData, now);
      return true;
    }
    
    // Check force fields
    if (forceFields) {
      for (const field of forceFields) {
        if (lastData[field] !== newData[field]) {
          this.updateLastSent(key, newData, now);
          return true;
        }
      }
    }
    
    // Check for significant numeric changes
    if (this.hasSignificantChange(lastData, newData)) {
      this.updateLastSent(key, newData, now);
      return true;
    }
    
    return false;
  }

  private hasSignificantChange(oldData: any, newData: any): boolean {
    for (const key of Object.keys(newData)) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      if (typeof oldValue === 'number' && typeof newValue === 'number') {
        const change = Math.abs((newValue - oldValue) / oldValue);
        if (change >= this.significantChangeThreshold) {
          return true;
        }
      } else if (oldValue !== newValue) {
        return true;
      }
    }
    
    return false;
  }

  private updateLastSent(key: string, data: any, time: number): void {
    this.lastSentData.set(key, { ...data });
    this.lastSentTime.set(key, time);
  }

  clear(): void {
    this.lastSentData.clear();
    this.lastSentTime.clear();
  }

  getThrottleStats() {
    const now = Date.now();
    const stats = Array.from(this.lastSentTime.entries()).map(([key, time]) => ({
      key,
      lastUpdate: time,
      timeSinceUpdate: now - time,
      isThrottled: now - time < this.throttleInterval
    }));
    
    return {
      totalKeys: stats.length,
      throttledKeys: stats.filter(s => s.isThrottled).length,
      stats
    };
  }
}