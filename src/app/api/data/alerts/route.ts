import { NextRequest, NextResponse } from 'next/server';
import { alertingService } from '@/services/external/monitoring/alerting';
import { logger } from '@/services/external/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const type = searchParams.get('type') as 'active' | 'all' | 'stats';
    const limit = parseInt(searchParams.get('limit') || '100');

    logger.info('API', 'Alerts request', { service, type, limit });

    switch (type) {
      case 'active':
        const activeAlerts = alertingService.getActiveAlerts(service || undefined);
        return NextResponse.json({
          alerts: activeAlerts,
          count: activeAlerts.length,
          timestamp: new Date().toISOString(),
        });

      case 'stats':
        const stats = alertingService.getAlertStats();
        return NextResponse.json({
          stats,
          timestamp: new Date().toISOString(),
        });

      case 'all':
      default:
        const allAlerts = alertingService.getAllAlerts(limit);
        const filteredAlerts = service 
          ? allAlerts.filter(alert => alert.service === service)
          : allAlerts;
        
        return NextResponse.json({
          alerts: filteredAlerts,
          count: filteredAlerts.length,
          total: allAlerts.length,
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error) {
    logger.error('API', 'Alerts fetch failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, service, ...alertData } = body;

    logger.info('API', 'Alert action request', { action, alertId, service });

    switch (action) {
      case 'create':
        const alert = alertingService.createAlert({
          type: alertData.type || 'info',
          service: alertData.service,
          message: alertData.message,
          data: alertData.data,
        });

        return NextResponse.json({
          success: true,
          alert,
          timestamp: new Date().toISOString(),
        });

      case 'resolve':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required for resolve action' },
            { status: 400 }
          );
        }

        const resolved = alertingService.resolveAlert(alertId);
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Alert resolved' : 'Alert not found or already resolved',
          timestamp: new Date().toISOString(),
        });

      case 'resolve_all':
        const resolvedCount = alertingService.resolveAllAlerts(service);
        return NextResponse.json({
          success: true,
          resolvedCount,
          message: `Resolved ${resolvedCount} alerts`,
          timestamp: new Date().toISOString(),
        });

      case 'test':
        // Create a test alert
        const testAlert = alertingService.createAlert({
          type: 'info',
          service: 'Test',
          message: 'This is a test alert',
          data: { test: true, timestamp: new Date().toISOString() },
        });

        return NextResponse.json({
          success: true,
          alert: testAlert,
          message: 'Test alert created',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('API', 'Alert action failed', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Alert action failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID required' },
        { status: 400 }
      );
    }

    logger.info('API', 'Delete alert request', { alertId });

    // For now, just resolve the alert since we don't have a delete method
    const resolved = alertingService.resolveAlert(alertId);
    
    return NextResponse.json({
      success: resolved,
      message: resolved ? 'Alert resolved (deleted)' : 'Alert not found',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('API', 'Delete alert failed', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Delete alert failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}