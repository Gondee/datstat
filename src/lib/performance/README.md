# Performance Optimization & Monitoring

This directory contains comprehensive performance optimization and monitoring utilities for the DatStat application.

## Features

### 1. Database Optimization (`db-optimization.ts`)
- **Query Performance Monitoring**: Tracks execution time for all database queries
- **Slow Query Detection**: Automatically identifies queries exceeding threshold (1s default)
- **Batch Operations**: Optimized batch create/update operations with chunking
- **Query Caching**: LRU cache for frequently accessed data
- **Connection Pool Monitoring**: Tracks database connection metrics
- **Streaming Support**: Large dataset streaming to prevent memory issues

### 2. API Optimization (`api-optimization.ts`)
- **Rate Limiting**: Per-user/endpoint rate limiting with configurable windows
- **Response Caching**: Intelligent caching with TTL and cache key generation
- **Response Compression**: Automatic gzip/brotli compression for large responses
- **Performance Metrics**: Tracks API response times and error rates
- **Batch Request Handler**: Support for batching multiple API calls

### 3. Cache Utilities (`cache-utils.ts`)
- **LRU Cache**: Configurable size and TTL with automatic eviction
- **Tiered Cache**: Two-level cache system (L1/L2) for optimal performance
- **Cache Key Generator**: Consistent key generation for queries and APIs
- **Response Cache**: Specialized cache for API responses

### 4. WebSocket Optimization (`websocket-optimization.ts`)
- **Message Batching**: Reduces network overhead by batching messages
- **Connection Pool**: Manages WebSocket connections with idle timeout
- **Smart Reconnection**: Exponential backoff with jitter for reconnections
- **Data Throttling**: Prevents flooding with intelligent update throttling

### 5. Frontend Optimization (`frontend-optimization.ts`)
- **React Hooks**: `useDebounce`, `useThrottle`, `useIntersectionObserver`
- **Virtual Scrolling**: Efficient rendering of large lists
- **Component Performance**: HOC for monitoring render performance
- **Image Optimization**: Lazy loading with placeholder support
- **Worker Manager**: Offload heavy computations to Web Workers

### 6. System Monitoring (`monitoring.ts`)
- **Health Checks**: Database, API, and external service health monitoring
- **System Metrics**: CPU, memory, and process monitoring
- **Error Tracking**: Comprehensive error logging with severity levels
- **Performance Dashboard**: Real-time metrics visualization

## Usage

### Database Query Optimization

```typescript
import { optimizedDb, dbMonitor } from '@/lib/performance/db-optimization';

// Cached query
const data = await optimizedDb.cachedQuery(
  'companies:all',
  () => prisma.company.findMany(),
  60000 // Cache for 1 minute
);

// Batch operations
await optimizedDb.batchUpdate('treasuryHolding', updates);

// Monitor query performance
const metrics = dbMonitor.getMetricsSummary();
```

### API Route Optimization

```typescript
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

export const GET = createOptimizedAPIHandler(
  async (request) => {
    // Your handler logic
    return NextResponse.json({ data });
  },
  {
    cache: { enabled: true, ttl: 30000 },
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    compression: true
  }
);
```

### Frontend Component Optimization

```tsx
import { OptimizedChart } from '@/components/charts/OptimizedChart';
import { useDebounce, useVirtualScroll } from '@/lib/performance/frontend-optimization';

function MyComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const { visibleItems, totalHeight, offsetY } = useVirtualScroll(
    items,
    itemHeight,
    containerHeight
  );
  
  return <OptimizedChart data={data} lazyLoad throttleUpdates />;
}
```

### Monitoring Dashboard

Visit `/monitoring` to view the real-time performance dashboard showing:
- System health status
- Database performance metrics
- API response times
- Cache utilization
- Error tracking
- Service status

## Performance Best Practices

1. **Always use cached queries** for frequently accessed data
2. **Batch database operations** when updating multiple records
3. **Enable compression** for API responses > 1KB
4. **Implement rate limiting** on all public endpoints
5. **Use virtual scrolling** for lists > 100 items
6. **Lazy load charts and images** below the fold
7. **Monitor slow queries** and optimize with proper indexes

## Configuration

### Environment Variables

```env
# Performance settings
DB_SLOW_QUERY_THRESHOLD=1000  # ms
API_RATE_LIMIT_WINDOW=60000    # ms
API_RATE_LIMIT_MAX=60          # requests
CACHE_TTL_DEFAULT=60000        # ms
```

### Database Indexes

Run the migration script to add performance indexes:

```bash
psql $DATABASE_URL < prisma/migrations/add_performance_indexes.sql
```

## Monitoring Endpoints

- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/metrics` - Performance metrics
- `POST /api/monitoring/metrics/clear` - Clear metrics data

## Troubleshooting

### High Database Response Times
1. Check slow query log: `dbMonitor.getSlowQueries()`
2. Verify indexes are created: `analyzeDatabasePerformance()`
3. Review connection pool stats

### API Performance Issues
1. Check rate limiting: May need to adjust limits
2. Review cache hit rates: Low rates indicate caching opportunities
3. Check compression: Large responses should be compressed

### Memory Issues
1. Enable streaming for large queries
2. Implement pagination for large datasets
3. Monitor memory usage in performance dashboard