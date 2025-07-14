# Real-Time Data Pipeline System

This document describes the complete real-time data processing and distribution system implemented for the Treasury Site.

## Architecture Overview

The system consists of several interconnected components:

1. **Job Scheduler** - Manages periodic data updates with adaptive rates
2. **Data Processor** - Validates, processes, and calculates derived metrics
3. **WebSocket Server** - Provides real-time data distribution to clients
4. **Market Hours Service** - Adapts refresh rates based on market conditions
5. **Resilience Service** - Implements circuit breakers, retries, and health monitoring
6. **Cache System** - Intelligent caching with TTL and warming strategies
7. **Pipeline Orchestrator** - Coordinates all components

## Getting Started

### 1. Initialize the Pipeline

```typescript
import { pipelineOrchestrator } from '@/services/pipeline/orchestrator';

// Start the entire pipeline
await pipelineOrchestrator.start();

// Or configure before starting
pipelineOrchestrator.updateConfig({
  enableJobScheduler: true,
  enableWebSocketServer: true,
  webSocketPort: 8080,
  enableMarketHoursAdaptation: true,
});
await pipelineOrchestrator.start();
```

### 2. Use Real-Time Data in React Components

```typescript
import { useRealTimeCompanyData, useRealTimeMarketData } from '@/hooks/useRealTimeData';
import { MetricCard } from '@/components/ui/MetricCard';

function CompanyDashboard({ ticker }: { ticker: string }) {
  const { 
    company, 
    isLoading, 
    error, 
    freshness, 
    refresh 
  } = useRealTimeCompanyData(ticker);

  const {
    marketData,
    freshness: marketFreshness,
    refresh: refreshMarket
  } = useRealTimeMarketData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Stock Price"
        value={company?.marketData?.price || 0}
        change={company?.marketData?.change24h}
        changeType="currency"
        freshness={{
          status: freshness.status,
          lastUpdated: freshness.lastUpdated,
          ageInSeconds: freshness.ageInSeconds,
          isRefreshing: freshness.isRefreshing,
          isConnected: true, // from WebSocket hook
          onRefresh: refresh,
        }}
        showLiveIndicator={true}
      />
      
      <MetricCard
        title="Treasury Value"
        value={company?.treasuryValue || 0}
        changeType="currency"
        freshness={{
          status: marketFreshness.status,
          lastUpdated: marketFreshness.lastUpdated,
          ageInSeconds: marketFreshness.ageInSeconds,
          isRefreshing: marketFreshness.isRefreshing,
          onRefresh: refreshMarket,
        }}
      />
    </div>
  );
}
```

### 3. Monitor Pipeline Health

```typescript
import { DataStatusIndicator } from '@/components/ui/DataStatusIndicator';

function AppHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>Treasury Dashboard</h1>
      <DataStatusIndicator showDetails={true} />
    </header>
  );
}
```

## Component Details

### Job Scheduler

Manages periodic data updates with configurable schedules:

- **Crypto prices**: Every 30 seconds (adaptive based on market conditions)
- **Stock prices**: Every 60 seconds during market hours, slower when closed
- **SEC filings**: Daily after market close
- **Treasury metrics**: Every 5 minutes
- **Data cleanup**: Daily maintenance

```typescript
import { jobScheduler } from '@/services/pipeline/jobScheduler';

// Add a custom job
jobScheduler.addJob({
  id: 'custom-job',
  name: 'Custom Data Job',
  enabled: true,
  interval: 120000, // 2 minutes
  maxRetries: 3,
  timeout: 30000,
  priority: 'medium',
  category: 'custom',
});

// Trigger a job manually
await jobScheduler.triggerJob('crypto-prices');

// Get job statistics
const stats = jobScheduler.getAllJobStatuses();
```

### Data Processor

Validates incoming data, detects changes, and calculates derived metrics:

```typescript
import { dataProcessor } from '@/services/pipeline/dataProcessor';

// Process crypto price data
const processedData = await dataProcessor.processCryptoPrice({
  symbol: 'BTC',
  price: 67830,
  change24h: 1250,
  change24hPercent: 1.88,
  marketCap: 1331000000000,
  volume24h: 28500000000,
  timestamp: new Date().toISOString(),
});

// Listen for significant changes
dataProcessor.on('significantChange', (event) => {
  console.log('Significant price change detected:', event);
});
```

### WebSocket Server

Provides real-time data distribution with subscription management:

```typescript
// Client-side WebSocket usage
import { useWebSocket } from '@/hooks/useWebSocket';

const [wsState, wsActions] = useWebSocket();

// Connect and subscribe to channels
useEffect(() => {
  wsActions.connect();
  wsActions.subscribe(['crypto:BTC', 'stocks:MSTR']);
  wsActions.joinRoom(['alerts', 'general']);
}, []);

// Handle incoming messages
useEffect(() => {
  if (wsState.lastMessage?.type === 'price_update') {
    console.log('Price update:', wsState.lastMessage.data);
  }
}, [wsState.lastMessage]);
```

### Market Hours Service

Adapts refresh rates based on market conditions:

```typescript
import { marketHoursService } from '@/services/pipeline/marketHours';

// Check market status
const stockStatus = marketHoursService.getMarketStatus('US_STOCKS');
console.log('Market is open:', stockStatus.isOpen);
console.log('Time to open:', stockStatus.timeToOpen);

// Calculate adaptive interval
const adaptiveInterval = marketHoursService.calculateAdaptiveInterval(
  60000, // base 1 minute
  'US_STOCKS'
);
// Returns 60000 during market hours, 180000 when closed, 300000 on weekends
```

### Resilience Service

Implements circuit breakers, retries, and health monitoring:

```typescript
import { resilienceService } from '@/services/pipeline/resilience';

// Execute with resilience patterns
const result = await resilienceService.executeWithResilience(
  async () => {
    // Your API call here
    return await fetch('/api/external-data');
  },
  {
    circuitBreaker: 'external_api',
    retry: 'network',
    bulkhead: 'database',
  }
);

// Get health status
const health = await resilienceService.getHealthStatus();
```

### Intelligent Cache

Advanced caching with TTL, warming strategies, and analytics:

```typescript
import { cache } from '@/services/external/utils/cache';

// Basic caching
cache.set('key', data, 300); // 5 minutes TTL

// Advanced operations
const data = await cache.getOrSet('key', async () => {
  return await expensiveOperation();
}, 600);

// Cache warming
cache.addWarmupStrategy({
  key: 'frequently-accessed-data',
  warmupFunction: async () => await loadData(),
  interval: 60000, // 1 minute
  priority: 'high',
});

// Pattern invalidation
cache.invalidatePattern('user:*');
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# External APIs
ALPHA_VANTAGE_API_KEY="your-key"
COINGECKO_API_KEY="your-key"

# WebSocket
WS_PORT=8080

# Pipeline
ENABLE_JOB_SCHEDULER=true
ENABLE_WEBSOCKET_SERVER=true
ENABLE_MARKET_HOURS_ADAPTATION=true
CACHE_MAX_SIZE=1000
```

### Pipeline Configuration

```typescript
const config = {
  enableJobScheduler: true,
  enableDataProcessor: true,
  enableWebSocketServer: true,
  enableMarketHoursAdaptation: true,
  enableResilience: true,
  webSocketPort: 8080,
  healthCheckInterval: 30000,
  metricsCollectionInterval: 60000,
};
```

## Monitoring and Metrics

### Health Checks

The system provides comprehensive health monitoring:

```typescript
// Get pipeline status
const status = pipelineOrchestrator.getStatus();
console.log('Pipeline running:', status.isRunning);
console.log('Component status:', status.components);

// Get detailed metrics
const metrics = pipelineOrchestrator.getMetrics();
console.log('Total data points processed:', metrics.totalDataPoints);
console.log('Cache hit rate:', metrics.cacheStats.hitRate);
console.log('WebSocket clients:', metrics.webSocketStats.totalClients);
```

### Event Monitoring

```typescript
// Monitor pipeline events
pipelineOrchestrator.on('dataProcessed', (event) => {
  console.log('Data processed:', event);
});

pipelineOrchestrator.on('significantChange', (event) => {
  console.log('Significant change detected:', event);
});

pipelineOrchestrator.on('jobFailed', (event) => {
  console.error('Job failed:', event);
});
```

## Error Handling

The system includes comprehensive error handling:

1. **Circuit Breakers**: Prevent cascading failures
2. **Retry Logic**: Exponential backoff with jitter
3. **Bulkheads**: Isolate different operations
4. **Health Checks**: Monitor component health
5. **Graceful Degradation**: Continue operating with reduced functionality

## Performance Considerations

1. **Adaptive Scheduling**: Reduces API calls during off-hours
2. **Intelligent Caching**: Minimizes redundant requests
3. **WebSocket Efficiency**: Real-time updates without polling
4. **Bulk Operations**: Process multiple items together
5. **Memory Management**: Automatic cleanup and size limits

## Integration with Existing Components

The real-time system seamlessly integrates with existing UI components:

1. **MetricCard**: Shows data freshness and live indicators
2. **DataTable**: Updates in real-time with live data
3. **Charts**: Streaming data updates
4. **Alerts**: Real-time price change notifications

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check if port 8080 is available
   - Verify WebSocket server is started
   - Check network connectivity

2. **Jobs Not Running**
   - Verify job scheduler is enabled
   - Check job configuration
   - Review error logs

3. **Data Not Updating**
   - Check external API keys
   - Verify rate limits
   - Review circuit breaker status

4. **High Memory Usage**
   - Check cache size limits
   - Review data retention policies
   - Monitor WebSocket connections

### Debugging

```typescript
// Enable debug logging
const debugConfig = {
  enableStats: true,
  debug: true,
};

// Check component status
const orchestratorStatus = pipelineOrchestrator.getStatus();
const jobStatuses = jobScheduler.getAllJobStatuses();
const cacheStats = cache.getStats();
const healthStatus = await resilienceService.getHealthStatus();
```

## Future Enhancements

1. **Distributed Architecture**: Scale across multiple instances
2. **Message Queues**: Redis/RabbitMQ for job processing
3. **Time-Series Database**: Specialized storage for metrics
4. **Machine Learning**: Predictive analytics for data changes
5. **Advanced Alerting**: Smart notifications based on patterns