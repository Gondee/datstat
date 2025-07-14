import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor, getMetricsDashboard } from '@/lib/performance/monitoring';
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

// Force Node.js runtime for database operations
export const runtime = 'nodejs';

// GET /api/monitoring/health - Get system health status
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';
    
    if (detailed) {
      // Return full metrics dashboard
      const dashboard = await getMetricsDashboard();
      
      return NextResponse.json({
        success: true,
        data: dashboard
      });
    } else {
      // Return basic health check
      const health = await systemMonitor.performHealthCheck();
      
      return NextResponse.json({
        success: true,
        status: health.overall,
        services: health.checks.map(check => ({
          name: check.service,
          status: check.status,
          message: check.message
        })),
        system: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    }
}