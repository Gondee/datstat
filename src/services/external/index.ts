// External API Integration Services
// Main entry point for all external data services

export { coinMarketCapService } from './apis/coinMarketCapService';
export { alphaVantageService } from './apis/alphaVantageService';
export { secEdgarService } from './apis/secEdgarService';

export { dataIntegrationService } from './dataIntegration';
export type { IntegrationConfig, DataSourceStatus } from './dataIntegration';

export { logger } from './utils/logger';
export { cache } from './utils/cache';
export { default as RateLimiter } from './utils/rateLimiter';

export { alertingService } from './monitoring/alerting';
export type { Alert, AlertRule } from './monitoring/alerting';

export { default as WebSocketDataServer } from './websocket/server';
export { WebSocketDataClient, useWebSocketData } from './websocket/client';

export * from './types';

// Import services for internal use
import { coinMarketCapService } from './apis/coinMarketCapService';
import { alphaVantageService } from './apis/alphaVantageService';
import { secEdgarService } from './apis/secEdgarService';
import { dataIntegrationService } from './dataIntegration';
import { logger } from './utils/logger';
import { alertingService } from './monitoring/alerting';
import { cache } from './utils/cache';

// Service health check utility
export async function getAllServiceHealth() {
  const [cryptoHealth, stockHealth, filingHealth, integrationHealth] = await Promise.allSettled([
    Promise.resolve(coinMarketCapService.getHealthStatus()),
    Promise.resolve(alphaVantageService.getHealthStatus()),
    Promise.resolve(secEdgarService.getHealthStatus()),
    dataIntegrationService.getDataSourceHealth(),
  ]);

  return {
    crypto: cryptoHealth.status === 'fulfilled' ? cryptoHealth.value : null,
    stocks: stockHealth.status === 'fulfilled' ? stockHealth.value : null,
    filings: filingHealth.status === 'fulfilled' ? filingHealth.value : null,
    integration: integrationHealth.status === 'fulfilled' ? integrationHealth.value : null,
    timestamp: new Date().toISOString(),
  };
}

// Initialize all services
export async function initializeExternalServices(config?: any) {
  logger.info('External Services', 'Initializing all external services');
  
  try {
    // Initialize data integration service
    await dataIntegrationService.initialize();
    
    logger.info('External Services', 'All external services initialized successfully');
    return true;
  } catch (error) {
    logger.error('External Services', 'Failed to initialize external services', error as Error);
    throw error;
  }
}

// Graceful shutdown of all services
export async function shutdownExternalServices() {
  logger.info('External Services', 'Shutting down all external services');
  
  try {
    await dataIntegrationService.destroy();
    alertingService.destroy();
    cache.destroy();
    
    logger.info('External Services', 'All external services shut down successfully');
  } catch (error) {
    logger.error('External Services', 'Error during service shutdown', error as Error);
    throw error;
  }
}