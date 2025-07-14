import { logger } from '../external/utils/logger';
import { jobScheduler } from './jobScheduler';
import { dataProcessor } from './dataProcessor';
import { resilienceService } from './resilience';
import { marketHoursService } from './marketHours';
import { dataIntegrationService } from '../external/dataIntegration';
import WebSocketDataServer from '../external/websocket/server';
import { cache } from '../external/utils/cache';
import EventEmitter from 'events';

export interface PipelineConfig {
  enableJobScheduler: boolean;
  enableDataProcessor: boolean;
  enableWebSocketServer: boolean;
  enableMarketHoursAdaptation: boolean;
  enableResilience: boolean;
  webSocketPort: number;
  healthCheckInterval: number; // milliseconds
  metricsCollectionInterval: number; // milliseconds
}

export interface PipelineMetrics {
  uptime: number;
  totalDataPoints: number;
  totalErrors: number;
  averageLatency: number;
  cacheStats: any;
  jobStats: any[];
  webSocketStats: any;
  healthStatus: any;
  marketStatus: any;
}

export interface PipelineStatus {
  isRunning: boolean;
  components: {
    jobScheduler: boolean;
    dataProcessor: boolean;
    webSocketServer: boolean;
    dataIntegration: boolean;
    resilience: boolean;
  };
  startTime?: Date;
  lastHealthCheck?: Date;
  errors: string[];
}

class DataPipelineOrchestrator extends EventEmitter {
  private config: PipelineConfig;
  private webSocketServer?: WebSocketDataServer;
  private isRunning = false;
  private startTime?: Date;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private metrics: Partial<PipelineMetrics> = {};
  private errors: string[] = [];

  constructor(config?: Partial<PipelineConfig>) {
    super();
    
    this.config = {
      enableJobScheduler: true,
      enableDataProcessor: true,
      enableWebSocketServer: true,
      enableMarketHoursAdaptation: true,
      enableResilience: true,
      webSocketPort: 8080,
      healthCheckInterval: 30000, // 30 seconds
      metricsCollectionInterval: 60000, // 1 minute
      ...config,
    };

    this.setupEventListeners();
    logger.info('PipelineOrchestrator', 'Initialized with config', this.config);
  }

  private setupEventListeners(): void {
    // Job scheduler events
    jobScheduler.on('jobCompleted', (event) => {
      this.emit('jobCompleted', event);
      logger.debug('PipelineOrchestrator', 'Job completed', event);
    });

    jobScheduler.on('jobFailed', (event) => {
      this.addError(`Job failed: ${event.jobId} - ${event.execution.error}`);
      this.emit('jobFailed', event);
      logger.warn('PipelineOrchestrator', 'Job failed', event);
    });

    // Data processor events
    dataProcessor.on('dataProcessed', (event) => {
      this.metrics.totalDataPoints = (this.metrics.totalDataPoints || 0) + 1;
      this.emit('dataProcessed', event);
    });

    dataProcessor.on('significantChange', (event) => {
      this.emit('significantChange', event);
      logger.info('PipelineOrchestrator', 'Significant data change detected', event);
    });

    // Resilience service events
    resilienceService.on('circuitBreakerStateChange', (event) => {
      const message = `Circuit breaker ${event.name} changed to ${event.state}`;
      if (event.state === 'open') {
        this.addError(message);
      }
      this.emit('circuitBreakerStateChange', event);
      logger.info('PipelineOrchestrator', message, event);
    });

    resilienceService.on('circuitBreakerFailure', (event) => {
      this.metrics.totalErrors = (this.metrics.totalErrors || 0) + 1;
      this.emit('circuitBreakerFailure', event);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('PipelineOrchestrator', 'Pipeline already running');
      return;
    }

    logger.info('PipelineOrchestrator', 'Starting data pipeline orchestrator');
    this.startTime = new Date();
    this.errors = [];

    try {
      // Start core services in order
      await this.startDataIntegration();
      await this.startJobScheduler();
      await this.startDataProcessor();
      await this.startWebSocketServer();
      await this.startMonitoring();

      this.isRunning = true;
      this.emit('started');
      
      logger.info('PipelineOrchestrator', 'Data pipeline started successfully', {
        components: this.getComponentStatus(),
        config: this.config,
      });

    } catch (error) {
      this.addError(`Failed to start pipeline: ${(error as Error).message}`);
      await this.stop();
      throw error;
    }
  }

  private async startDataIntegration(): Promise<void> {
    try {
      await dataIntegrationService.initialize();
      logger.info('PipelineOrchestrator', 'Data integration service started');
    } catch (error) {
      throw new Error(`Failed to start data integration: ${(error as Error).message}`);
    }
  }

  private async startJobScheduler(): Promise<void> {
    if (!this.config.enableJobScheduler) {
      logger.info('PipelineOrchestrator', 'Job scheduler disabled');
      return;
    }

    try {
      // Configure adaptive intervals based on market hours
      if (this.config.enableMarketHoursAdaptation) {
        this.configureAdaptiveJobScheduling();
      }

      jobScheduler.start();
      logger.info('PipelineOrchestrator', 'Job scheduler started');
    } catch (error) {
      throw new Error(`Failed to start job scheduler: ${(error as Error).message}`);
    }
  }

  private configureAdaptiveJobScheduling(): void {
    // Update crypto job interval based on market conditions
    const cryptoBaseInterval = 30000; // 30 seconds
    const cryptoAdaptiveInterval = marketHoursService.calculateAdaptiveInterval(
      cryptoBaseInterval,
      'CRYPTO'
    );
    
    jobScheduler.updateJob('crypto-prices', { 
      interval: cryptoAdaptiveInterval 
    });

    // Update stock job interval based on market hours
    const stockBaseInterval = 60000; // 1 minute
    const stockAdaptiveInterval = marketHoursService.calculateAdaptiveInterval(
      stockBaseInterval,
      'US_STOCKS'
    );
    
    jobScheduler.updateJob('stock-prices', { 
      interval: stockAdaptiveInterval 
    });

    logger.info('PipelineOrchestrator', 'Configured adaptive job scheduling', {
      cryptoInterval: cryptoAdaptiveInterval,
      stockInterval: stockAdaptiveInterval,
    });

    // Set up periodic reconfiguration
    setInterval(() => {
      this.configureAdaptiveJobScheduling();
    }, 300000); // Every 5 minutes
  }

  private async startDataProcessor(): Promise<void> {
    if (!this.config.enableDataProcessor) {
      logger.info('PipelineOrchestrator', 'Data processor disabled');
      return;
    }

    // Data processor is event-driven, no explicit start needed
    logger.info('PipelineOrchestrator', 'Data processor ready');
  }

  private async startWebSocketServer(): Promise<void> {
    if (!this.config.enableWebSocketServer) {
      logger.info('PipelineOrchestrator', 'WebSocket server disabled');
      return;
    }

    try {
      this.webSocketServer = new WebSocketDataServer(this.config.webSocketPort);
      await this.webSocketServer.start();
      
      // Set up WebSocket event listeners
      this.webSocketServer.on('started', () => {
        this.emit('webSocketStarted');
      });

      this.webSocketServer.on('stopped', () => {
        this.emit('webSocketStopped');
      });

      logger.info('PipelineOrchestrator', 'WebSocket server started', {
        port: this.config.webSocketPort,
      });
    } catch (error) {
      throw new Error(`Failed to start WebSocket server: ${(error as Error).message}`);
    }
  }

  private async startMonitoring(): Promise<void> {
    // Start health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsCollectionInterval);

    // Register health checks with resilience service
    if (this.config.enableResilience) {
      this.registerHealthChecks();
    }

    logger.info('PipelineOrchestrator', 'Monitoring started');
  }

  private registerHealthChecks(): void {
    // Pipeline health check
    resilienceService.registerHealthCheck('pipeline', async () => {
      const isHealthy = this.isRunning && this.errors.length === 0;
      return {
        healthy: isHealthy,
        latency: 0,
        timestamp: new Date(),
        error: isHealthy ? undefined : 'Pipeline has errors',
      };
    });

    // Job scheduler health check
    resilienceService.registerHealthCheck('jobScheduler', async () => {
      const runningJobs = jobScheduler.getRunningJobs();
      const isHealthy = this.config.enableJobScheduler ? runningJobs.length >= 0 : true;
      
      return {
        healthy: isHealthy,
        latency: 0,
        timestamp: new Date(),
        error: isHealthy ? undefined : 'Job scheduler not responding',
      };
    });

    // WebSocket server health check
    resilienceService.registerHealthCheck('webSocketServer', async () => {
      const stats = this.webSocketServer?.getConnectionStats();
      const isHealthy = this.config.enableWebSocketServer ? !!stats?.isRunning : true;
      
      return {
        healthy: isHealthy,
        latency: 0,
        timestamp: new Date(),
        error: isHealthy ? undefined : 'WebSocket server not running',
      };
    });

    // Cache health check
    resilienceService.registerHealthCheck('cache', async () => {
      const stats = cache.getStats();
      const isHealthy = stats.size >= 0; // Simple check
      
      return {
        healthy: isHealthy,
        latency: 0,
        timestamp: new Date(),
      };
    });

    logger.info('PipelineOrchestrator', 'Health checks registered with resilience service');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const status = this.getStatus();
      this.emit('healthCheck', status);
      
      // Log warnings for any component issues
      const downComponents = Object.entries(status.components)
        .filter(([name, isUp]) => !isUp)
        .map(([name]) => name);

      if (downComponents.length > 0) {
        logger.warn('PipelineOrchestrator', 'Some components are down', {
          downComponents,
        });
      }

    } catch (error) {
      this.addError(`Health check failed: ${(error as Error).message}`);
      logger.error('PipelineOrchestrator', 'Health check failed', error as Error);
    }
  }

  private collectMetrics(): void {
    try {
      this.metrics = {
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        totalDataPoints: this.metrics.totalDataPoints || 0,
        totalErrors: this.metrics.totalErrors || 0,
        averageLatency: 0, // Would need to track this across operations
        cacheStats: cache.getStats(),
        jobStats: jobScheduler.getAllJobStatuses(),
        webSocketStats: this.webSocketServer?.getConnectionStats(),
        healthStatus: this.config.enableResilience ? {} : undefined, // Would get from resilience service
        marketStatus: marketHoursService.getAllMarketStatuses(),
      };

      this.emit('metricsCollected', this.metrics);
      
      logger.debug('PipelineOrchestrator', 'Metrics collected', {
        dataPoints: this.metrics.totalDataPoints,
        errors: this.metrics.totalErrors,
        cacheSize: this.metrics.cacheStats?.size,
        wsClients: this.metrics.webSocketStats?.totalClients,
      });

    } catch (error) {
      this.addError(`Metrics collection failed: ${(error as Error).message}`);
      logger.error('PipelineOrchestrator', 'Metrics collection failed', error as Error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('PipelineOrchestrator', 'Pipeline not running');
      return;
    }

    logger.info('PipelineOrchestrator', 'Stopping data pipeline orchestrator');

    try {
      // Stop monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Stop components in reverse order
      if (this.webSocketServer) {
        await this.webSocketServer.stop();
      }

      if (this.config.enableJobScheduler) {
        jobScheduler.stop();
      }

      dataIntegrationService.stopAutoRefresh();

      if (this.config.enableResilience) {
        resilienceService.stop();
      }

      this.isRunning = false;
      this.emit('stopped');
      
      logger.info('PipelineOrchestrator', 'Data pipeline stopped successfully');

    } catch (error) {
      this.addError(`Failed to stop pipeline: ${(error as Error).message}`);
      logger.error('PipelineOrchestrator', 'Failed to stop pipeline', error as Error);
    }
  }

  async restart(): Promise<void> {
    logger.info('PipelineOrchestrator', 'Restarting data pipeline');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
    await this.start();
  }

  private addError(error: string): void {
    this.errors.push(error);
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }

  private getComponentStatus() {
    return {
      jobScheduler: this.config.enableJobScheduler && jobScheduler.getAllJobStatuses().length > 0,
      dataProcessor: this.config.enableDataProcessor,
      webSocketServer: this.config.enableWebSocketServer && !!this.webSocketServer?.getConnectionStats()?.isRunning,
      dataIntegration: true, // Assume running if no errors
      resilience: this.config.enableResilience,
    };
  }

  getStatus(): PipelineStatus {
    return {
      isRunning: this.isRunning,
      components: this.getComponentStatus(),
      startTime: this.startTime,
      lastHealthCheck: new Date(),
      errors: [...this.errors],
    };
  }

  getMetrics(): PipelineMetrics {
    return {
      uptime: 0,
      totalDataPoints: 0,
      totalErrors: 0,
      averageLatency: 0,
      cacheStats: {},
      jobStats: [],
      webSocketStats: {},
      healthStatus: {},
      marketStatus: {},
      ...this.metrics,
    };
  }

  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<PipelineConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('PipelineOrchestrator', 'Configuration updated', {
      changes: Object.keys(newConfig),
      oldConfig,
      newConfig: this.config,
    });

    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }

  // Manual trigger methods
  async triggerDataRefresh(dataTypes?: string[]): Promise<void> {
    logger.info('PipelineOrchestrator', 'Manual data refresh triggered', { dataTypes });
    
    if (dataTypes?.includes('crypto') || !dataTypes) {
      await jobScheduler.triggerJob('crypto-prices');
    }
    
    if (dataTypes?.includes('stocks') || !dataTypes) {
      await jobScheduler.triggerJob('stock-prices');
    }
    
    if (dataTypes?.includes('filings') || !dataTypes) {
      await jobScheduler.triggerJob('sec-filings');
    }
  }

  async clearCache(pattern?: string): Promise<number> {
    if (pattern) {
      return cache.invalidatePattern(pattern);
    } else {
      cache.clear();
      return 0;
    }
  }

  // Market hours integration
  getCurrentMarketStatus(): any {
    return marketHoursService.getAllMarketStatuses();
  }

  async adaptToMarketHours(): Promise<void> {
    if (this.config.enableMarketHoursAdaptation) {
      this.configureAdaptiveJobScheduling();
    }
  }
}

// Singleton instance
export const pipelineOrchestrator = new DataPipelineOrchestrator();
export default DataPipelineOrchestrator;