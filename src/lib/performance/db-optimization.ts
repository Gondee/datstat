import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/services/external/utils/logger';
import { LRUCache } from './cache-utils';

// Query performance monitoring
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

class DatabasePerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  public queryCache = new LRUCache<string, any>(1000);

  async executeWithMetrics<T>(
    operation: () => Promise<T>,
    queryDescription: string,
    params?: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordMetrics({
        query: queryDescription,
        duration,
        timestamp: new Date(),
        params
      });
      
      if (duration > this.slowQueryThreshold) {
        logger.warn('Database', `Slow query detected: ${queryDescription}`, {
          duration,
          params
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database', `Query failed: ${queryDescription}`);
      throw error;
    }
  }

  private recordMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only last 1000 queries
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }
  }

  getSlowQueries(threshold?: number): QueryMetrics[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.queryMetrics.filter(m => m.duration > limit);
  }

  getAverageQueryTime(): number {
    if (this.queryMetrics.length === 0) return 0;
    const total = this.queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.queryMetrics.length;
  }

  clearMetrics(): void {
    this.queryMetrics = [];
  }

  getMetricsSummary() {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.getSlowQueries().length;
    const avgTime = this.getAverageQueryTime();
    const maxTime = Math.max(...this.queryMetrics.map(m => m.duration), 0);
    
    return {
      totalQueries,
      slowQueries,
      averageTime: avgTime,
      maxTime,
      slowQueryRatio: totalQueries > 0 ? slowQueries / totalQueries : 0
    };
  }
}

export const dbMonitor = new DatabasePerformanceMonitor();

// Optimized database queries with batching and caching
export class OptimizedDatabaseOperations {
  private batchQueue = new Map<string, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize = 100;
  private batchDelay = 50; // ms

  // Batch create operations
  async batchCreate<T>(
    model: keyof typeof prisma,
    data: T[],
    options?: { skipDuplicates?: boolean }
  ): Promise<void> {
    const chunks = this.chunkArray(data, this.batchSize);
    
    for (const chunk of chunks) {
      await dbMonitor.executeWithMetrics(
        async () => {
          return await (prisma[model] as any).createMany({
            data: chunk,
            skipDuplicates: options?.skipDuplicates
          });
        },
        `Batch create ${String(model)}`,
        { count: chunk.length }
      );
    }
  }

  // Batch update operations
  async batchUpdate<T extends { id: string }>(
    model: keyof typeof prisma,
    updates: T[]
  ): Promise<void> {
    const chunks = this.chunkArray(updates, this.batchSize);
    
    for (const chunk of chunks) {
      await dbMonitor.executeWithMetrics(
        async () => {
          return await prisma.$transaction(
            chunk.map(update => 
              (prisma[model] as any).update({
                where: { id: update.id },
                data: update
              })
            )
          );
        },
        `Batch update ${String(model)}`,
        { count: chunk.length }
      );
    }
  }

  // Optimized query with caching
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 60000 // 1 minute default
  ): Promise<T> {
    const cached = dbMonitor.queryCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = await dbMonitor.executeWithMetrics(
      queryFn,
      `Cached query: ${key}`
    );
    
    dbMonitor.queryCache.set(key, result, ttl);
    return result;
  }

  // Parallel query execution
  async parallelQueries<T extends Record<string, () => Promise<any>>>(
    queries: T
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    const entries = Object.entries(queries);
    const results = await Promise.all(
      entries.map(async ([key, queryFn]) => {
        const result = await dbMonitor.executeWithMetrics(
          queryFn,
          `Parallel query: ${key}`
        );
        return [key, result];
      })
    );
    
    return Object.fromEntries(results) as any;
  }

  // Connection pool monitoring
  async getConnectionPoolStats() {
    // TODO: Fix Prisma metrics API
    // const metrics = await prisma.$metrics.json();
    return {
      counters: {},
      gauges: {},
      histograms: {}
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const optimizedDb = new OptimizedDatabaseOperations();

// Database index recommendations
export async function analyzeDatabasePerformance() {
  const recommendations: string[] = [];
  
  // Check for missing indexes on foreign keys
  const foreignKeyColumns = [
    { table: 'treasury_holdings', column: 'companyId' },
    { table: 'treasury_transactions', column: 'companyId' },
    { table: 'treasury_transactions', column: 'holdingId' },
    { table: 'market_data', column: 'companyId' },
    { table: 'capital_structure', column: 'companyId' },
    { table: 'executive_compensation', column: 'companyId' },
    { table: 'historical_metrics', column: 'companyId' },
  ];
  
  // Check for composite indexes that might be beneficial
  const compositeIndexSuggestions = [
    { table: 'market_data', columns: ['ticker', 'timestamp'] },
    { table: 'historical_metrics', columns: ['companyId', 'date'] },
    { table: 'treasury_holdings', columns: ['companyId', 'crypto'] },
    { table: 'executive_compensation', columns: ['companyId', 'year'] },
  ];
  
  recommendations.push(...compositeIndexSuggestions.map(
    ({ table, columns }) => 
      `Consider adding composite index on ${table}(${columns.join(', ')})`
  ));
  
  return {
    recommendations,
    metrics: dbMonitor.getMetricsSummary(),
    slowQueries: dbMonitor.getSlowQueries()
  };
}

// Automatic query optimization middleware
export function createOptimizedPrismaClient() {
  return new Proxy(prisma, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];
      
      if (typeof original === 'object' && original !== null) {
        return new Proxy(original, {
          get(modelTarget, modelProp) {
            const method = modelTarget[modelProp as keyof typeof modelTarget];
            
            if (typeof method === 'function') {
              return async (...args: any[]) => {
                const operation = `${String(prop)}.${String(modelProp)}`;
                return await dbMonitor.executeWithMetrics(
                  () => (method as any).apply(modelTarget, args),
                  operation,
                  args[0]
                );
              };
            }
            
            return method;
          }
        });
      }
      
      return original;
    }
  });
}

// Query result streaming for large datasets
export async function* streamLargeQuery<T>(
  queryFn: (args: { skip: number; take: number }) => Promise<T[]>,
  batchSize: number = 100
): AsyncGenerator<T[], void, unknown> {
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await queryFn({ skip, take: batchSize });
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      yield batch;
      skip += batchSize;
      
      if (batch.length < batchSize) {
        hasMore = false;
      }
    }
  }
}