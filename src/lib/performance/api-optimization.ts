import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/services/external/utils/logger';
import { apiCache, CacheKeyGenerator } from './cache-utils';
import { compress, decompress } from './compression-utils';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// API performance metrics
interface APIMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  error?: string;
}

class APIPerformanceMonitor {
  private metrics: APIMetrics[] = [];
  private slowAPIThreshold = 2000; // 2 seconds

  recordMetric(metric: APIMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    
    if (metric.duration > this.slowAPIThreshold) {
      logger.warn('API', `Slow API call: ${metric.endpoint}`, {
        duration: metric.duration,
        userId: metric.userId
      });
    }
  }

  getMetricsSummary() {
    const endpointStats = new Map<string, {
      count: number;
      totalDuration: number;
      errors: number;
    }>();
    
    for (const metric of this.metrics) {
      const key = `${metric.method} ${metric.endpoint}`;
      const stats = endpointStats.get(key) || { count: 0, totalDuration: 0, errors: 0 };
      
      stats.count++;
      stats.totalDuration += metric.duration;
      if (metric.error) stats.errors++;
      
      endpointStats.set(key, stats);
    }
    
    const summary = Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      avgDuration: stats.totalDuration / stats.count,
      callCount: stats.count,
      errorRate: stats.errors / stats.count,
      totalDuration: stats.totalDuration
    }));
    
    return {
      totalCalls: this.metrics.length,
      avgDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      errorRate: this.metrics.filter(m => m.error).length / this.metrics.length,
      endpoints: summary.sort((a, b) => b.totalDuration - a.totalDuration)
    };
  }
}

export const apiMonitor = new APIPerformanceMonitor();

// Rate limiting implementation
export async function rateLimit(
  request: NextRequest,
  options: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: NextRequest) => string;
  } = {}
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60,
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'anonymous'
  } = options;
  
  const key = keyGenerator(request);
  const now = Date.now();
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k);
    }
  }
  
  const userLimit = rateLimitStore.get(key);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true };
  }
  
  if (userLimit.count >= maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// Response compression middleware
export async function compressResponse(
  response: any,
  acceptEncoding: string | null
): Promise<{ data: any; encoding?: string }> {
  if (!acceptEncoding || typeof response !== 'object') {
    return { data: response };
  }
  
  const jsonString = JSON.stringify(response);
  
  // Only compress if response is larger than 1KB
  if (jsonString.length < 1024) {
    return { data: response };
  }
  
  if (acceptEncoding.includes('gzip')) {
    const compressed = await compress(jsonString, 'gzip');
    return { data: compressed, encoding: 'gzip' };
  }
  
  if (acceptEncoding.includes('br')) {
    const compressed = await compress(jsonString, 'br');
    return { data: compressed, encoding: 'br' };
  }
  
  return { data: response };
}

// Enhanced API handler with performance features
export function createOptimizedAPIHandler<T = any>(
  handler: (req: NextRequest, params?: any) => Promise<NextResponse<T>>,
  options: {
    cache?: {
      enabled: boolean;
      ttl?: number;
      keyGenerator?: (req: NextRequest, params?: any) => string;
    };
    rateLimit?: {
      windowMs?: number;
      maxRequests?: number;
    };
    compression?: boolean;
  } = {}
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const endpoint = request.nextUrl.pathname;
    const method = request.method;
    
    try {
      // Rate limiting
      if (options.rateLimit) {
        const { allowed, retryAfter } = await rateLimit(request, options.rateLimit);
        
        if (!allowed) {
          return NextResponse.json(
            { error: 'Too many requests' },
            {
              status: 429,
              headers: {
                'Retry-After': retryAfter!.toString(),
                'X-RateLimit-Limit': options.rateLimit.maxRequests!.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(Date.now() + retryAfter! * 1000).toISOString()
              }
            }
          );
        }
      }
      
      // Caching
      let response: NextResponse;
      
      if (options.cache?.enabled && request.method === 'GET') {
        const cacheKey = options.cache.keyGenerator
          ? options.cache.keyGenerator(request, params)
          : CacheKeyGenerator.generateForAPI(endpoint, { 
              params, 
              query: Object.fromEntries(request.nextUrl.searchParams) 
            });
        
        const cachedResponse = await apiCache.getCachedResponse(
          cacheKey,
          async () => {
            const res = await handler(request, params);
            return await res.json();
          },
          { ttl: options.cache.ttl }
        );
        
        response = NextResponse.json(cachedResponse);
      } else {
        response = await handler(request, params);
      }
      
      // Compression
      if (options.compression) {
        const acceptEncoding = request.headers.get('accept-encoding');
        const responseData = await response.json();
        const { data, encoding } = await compressResponse(responseData, acceptEncoding);
        
        response = new NextResponse(
          encoding ? data : JSON.stringify(data),
          {
            status: response.status,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Content-Type': 'application/json',
              ...(encoding && { 'Content-Encoding': encoding })
            }
          }
        );
      }
      
      // Add performance headers
      const duration = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Cached', options.cache?.enabled ? 'true' : 'false');
      
      // Record metrics
      apiMonitor.recordMetric({
        endpoint,
        method,
        duration,
        statusCode: response.status,
        timestamp: new Date()
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      apiMonitor.recordMetric({
        endpoint,
        method,
        duration,
        statusCode: 500,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      logger.error('API', `Handler error: ${endpoint}`, error as Error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Batch API requests handler
export async function handleBatchRequests(
  requests: Array<{
    id: string;
    endpoint: string;
    method: string;
    body?: any;
  }>
): Promise<Array<{ id: string; status: number; data: any }>> {
  const results = await Promise.all(
    requests.map(async (req) => {
      try {
        // Simulate internal API call
        // In a real implementation, this would route to actual handlers
        const result = { success: true, data: `Result for ${req.endpoint}` };
        
        return {
          id: req.id,
          status: 200,
          data: result
        };
      } catch (error) {
        return {
          id: req.id,
          status: 500,
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    })
  );
  
  return results;
}

// JSON parsing optimization
export async function parseJSONSafely<T>(text: string): Promise<T | null> {
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.error('API', 'JSON parsing error', error as Error);
    return null;
  }
}

// Streaming JSON parser for large payloads
export async function* streamJSONArray(stream: ReadableStream): AsyncGenerator<any> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Simple JSON array streaming parser
      let start = buffer.indexOf('[');
      if (start === -1) continue;
      
      buffer = buffer.substring(start + 1);
      
      while (true) {
        const end = buffer.indexOf('},');
        if (end === -1) break;
        
        const item = buffer.substring(0, end + 1);
        buffer = buffer.substring(end + 2);
        
        try {
          yield JSON.parse(item);
        } catch (e) {
          // Invalid JSON, skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}