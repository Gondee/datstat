import { NextRequest, NextResponse } from 'next/server';
import { dataIntegrationService } from '@/services/external/dataIntegration';
import { coinMarketCapService } from '@/services/external/apis/coinMarketCapService';
import { alphaVantageService } from '@/services/external/apis/alphaVantageService';
import { secEdgarService } from '@/services/external/apis/secEdgarService';
import { logger } from '@/services/external/utils/logger';
import { cache } from '@/services/external/utils/cache';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const service = searchParams.get('service');

    logger.info('API', 'Health check request', { detailed, service });

    if (service) {
      // Get health for specific service
      let serviceHealth;
      
      switch (service.toLowerCase()) {
        case 'coinmarketcap':
          serviceHealth = coinMarketCapService.getHealthStatus();
          break;
        case 'alphavantage':
          serviceHealth = alphaVantageService.getHealthStatus();
          break;
        case 'sec':
        case 'edgar':
          serviceHealth = secEdgarService.getHealthStatus();
          break;
        default:
          return NextResponse.json(
            { error: `Unknown service: ${service}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        service,
        health: serviceHealth,
        timestamp: new Date().toISOString(),
      });
    }

    // Get overall system health
    const [
      cryptoHealth,
      stockHealth,
      filingHealth,
      dataSourceHealth,
      databaseHealth,
    ] = await Promise.allSettled([
      Promise.resolve(coinMarketCapService.getHealthStatus()),
      Promise.resolve(alphaVantageService.getHealthStatus()),
      Promise.resolve(secEdgarService.getHealthStatus()),
      dataIntegrationService.getDataSourceHealth(),
      checkDatabaseHealth(),
    ]);

    const cacheStats = cache.getStats();
    const logStats = logger.getStats();

    const response: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        coinMarketCap: getSettledValue(cryptoHealth),
        alphaVantage: getSettledValue(stockHealth),
        secEdgar: getSettledValue(filingHealth),
      },
      dataSources: getSettledValue(dataSourceHealth, []),
      database: getSettledValue(databaseHealth),
      cache: cacheStats,
      uptime: process.uptime(),
    };

    if (detailed) {
      response.detailed = {
        logs: logStats,
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV,
      };
    }

    // Determine overall health status
    const hasErrors = [cryptoHealth, stockHealth, filingHealth, databaseHealth]
      .some(result => result.status === 'rejected');
    
    if (hasErrors) {
      response.status = 'degraded';
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('API', 'Health check failed', error as Error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function checkDatabaseHealth(): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Test database connection with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const latency = Date.now() - startTime;
    
    // Get basic database stats
    const [companiesCount, marketDataCount, dataSourcesCount] = await Promise.all([
      prisma.company.count(),
      prisma.marketData.count(),
      prisma.dataSource.count(),
    ]);

    return {
      status: 'healthy',
      latency,
      counts: {
        companies: companiesCount,
        marketData: marketDataCount,
        dataSources: dataSourcesCount,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
      latency: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    };
  }
}

function getSettledValue<T>(result: PromiseSettledResult<T>, defaultValue?: T): T {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  return defaultValue as T;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, service } = body;

    logger.info('API', 'Health action request', { action, service });

    switch (action) {
      case 'clear_cache':
        cache.clear();
        logger.info('API', 'Cache cleared via health endpoint');
        return NextResponse.json({
          success: true,
          message: 'Cache cleared',
          timestamp: new Date().toISOString(),
        });

      case 'clear_logs':
        logger.clear();
        logger.info('API', 'Logs cleared via health endpoint');
        return NextResponse.json({
          success: true,
          message: 'Logs cleared',
          timestamp: new Date().toISOString(),
        });

      case 'test_connection':
        if (!service) {
          return NextResponse.json(
            { error: 'Service parameter required for test_connection' },
            { status: 400 }
          );
        }

        let testResult;
        switch (service.toLowerCase()) {
          case 'coinmarketcap':
            testResult = await coinMarketCapService.getCryptoPrice('BTC');
            break;
          case 'alphavantage':
            testResult = await alphaVantageService.getStockQuote('MSTR');
            break;
          case 'sec':
            testResult = await secEdgarService.getRecentQuarterlyFilings('MSTR');
            break;
          default:
            return NextResponse.json(
              { error: `Unknown service: ${service}` },
              { status: 400 }
            );
        }

        return NextResponse.json({
          success: true,
          service,
          testResult: {
            success: testResult.success,
            timestamp: testResult.timestamp,
            source: testResult.source,
          },
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('API', 'Health action failed', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Health action failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}