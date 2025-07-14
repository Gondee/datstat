import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor, getMetricsDashboard } from '@/lib/performance/monitoring';
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

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
          cpu: health.system.cpu.usage.toFixed(2) + '%',
          memory: health.system.memory.percentUsed.toFixed(2) + '%',
          uptime: Math.floor(health.system.process.uptime / 60) + ' minutes'
        }
      });
    }
}