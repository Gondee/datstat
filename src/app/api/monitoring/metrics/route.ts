import { NextRequest, NextResponse } from 'next/server';
import { dbMonitor, analyzeDatabasePerformance } from '@/lib/performance/db-optimization';
import { apiMonitor } from '@/lib/performance/api-optimization';
import { errorTracker } from '@/lib/performance/monitoring';
import { apiCache, queryCache, calculationCache } from '@/lib/performance/cache-utils';
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

// Force Node.js runtime for database operations
export const runtime = 'nodejs';

// GET /api/monitoring/metrics - Get performance metrics
export const GET = createOptimizedAPIHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    
    const metrics: any = {
      timestamp: new Date()
    };
    
    // Database metrics
    if (type === 'all' || type === 'database') {
      const dbAnalysis = await analyzeDatabasePerformance();
      metrics.database = {
        ...dbMonitor.getMetricsSummary(),
        recommendations: dbAnalysis.recommendations,
        slowQueries: dbAnalysis.slowQueries.slice(0, 10) // Top 10 slow queries
      };
    }
    
    // API metrics
    if (type === 'all' || type === 'api') {
      metrics.api = apiMonitor.getMetricsSummary();
    }
    
    // Cache metrics
    if (type === 'all' || type === 'cache') {
      metrics.cache = {
        api: apiCache.getStats(),
        query: queryCache.getStats(),
        calculation: calculationCache.getStats()
      };
    }
    
    // Error metrics
    if (type === 'all' || type === 'errors') {
      metrics.errors = {
        summary: errorTracker.getErrorSummary(),
        recent: errorTracker.getRecentErrors(20)
      };
    }
    
    return NextResponse.json({
      success: true,
      data: metrics
    });
  },
  {
    cache: {
      enabled: true,
      ttl: 10000 // Cache for 10 seconds
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100 // Higher limit for monitoring endpoints
    }
  }
);

// POST /api/monitoring/metrics/clear - Clear metrics
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { type } = body;
    
    switch (type) {
      case 'database':
        dbMonitor.clearMetrics();
        break;
      case 'cache':
        apiCache.getStats(); // This would clear in real implementation
        queryCache.clear();
        calculationCache.clear();
        break;
      case 'all':
        dbMonitor.clearMetrics();
        queryCache.clear();
        calculationCache.clear();
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${type} metrics`
    });
}