import { logger } from '@/services/external/utils/logger';
import { prisma } from '@/lib/prisma';
import { dbMonitor } from './db-optimization';
import { apiMonitor } from './api-optimization';
import os from 'os';

// System metrics collection
interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentUsed: number;
  };
  process: {
    uptime: number;
    pid: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  metrics?: any;
  lastCheck: Date;
}

class SystemMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private metricsHistory: SystemMetrics[] = [];
  private alertThresholds = {
    cpuUsage: 80,
    memoryUsage: 85,
    dbResponseTime: 2000,
    apiResponseTime: 3000,
    errorRate: 0.05
  };

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    const metrics: SystemMetrics = {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentUsed: (usedMemory / totalMemory) * 100
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        memoryUsage: process.memoryUsage()
      }
    };
    
    this.metricsHistory.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
    
    // Check for alerts
    this.checkAlerts(metrics);
    
    return metrics;
  }

  private checkAlerts(metrics: SystemMetrics): void {
    if (metrics.cpu.usage > this.alertThresholds.cpuUsage) {
      logger.warn('Monitor', `High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`);
    }
    
    if (metrics.memory.percentUsed > this.alertThresholds.memoryUsage) {
      logger.warn('Monitor', `High memory usage: ${metrics.memory.percentUsed.toFixed(2)}%`);
    }
  }

  async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      // Get database metrics
      const dbMetrics = dbMonitor.getMetricsSummary();
      
      const status = responseTime > this.alertThresholds.dbResponseTime ? 'degraded' : 'healthy';
      
      const check: HealthCheck = {
        service: 'database',
        status,
        message: `Response time: ${responseTime}ms`,
        metrics: {
          responseTime,
          ...dbMetrics
        },
        lastCheck: new Date()
      };
      
      this.healthChecks.set('database', check);
      return check;
    } catch (error) {
      const check: HealthCheck = {
        service: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      
      this.healthChecks.set('database', check);
      return check;
    }
  }

  async checkAPIHealth(): Promise<HealthCheck> {
    const apiMetrics = apiMonitor.getMetricsSummary();
    
    const status = apiMetrics.errorRate > this.alertThresholds.errorRate ? 'degraded' : 'healthy';
    
    const check: HealthCheck = {
      service: 'api',
      status,
      message: `Error rate: ${(apiMetrics.errorRate * 100).toFixed(2)}%`,
      metrics: apiMetrics,
      lastCheck: new Date()
    };
    
    this.healthChecks.set('api', check);
    return check;
  }

  async checkExternalServices(): Promise<HealthCheck[]> {
    const services = [
      { name: 'coinGecko', url: 'https://api.coingecko.com/api/v3/ping' },
      { name: 'alphaVantage', url: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo' }
    ];
    
    const checks = await Promise.all(
      services.map(async (service) => {
        const startTime = Date.now();
        
        try {
          const response = await fetch(service.url, {
            signal: AbortSignal.timeout(5000)
          });
          
          const responseTime = Date.now() - startTime;
          const status = response.ok ? 'healthy' : 'degraded';
          
          const check: HealthCheck = {
            service: service.name,
            status,
            message: `Status: ${response.status}, Response time: ${responseTime}ms`,
            metrics: { responseTime, statusCode: response.status },
            lastCheck: new Date()
          };
          
          this.healthChecks.set(service.name, check);
          return check;
        } catch (error) {
          const check: HealthCheck = {
            service: service.name,
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
            lastCheck: new Date()
          };
          
          this.healthChecks.set(service.name, check);
          return check;
        }
      })
    );
    
    return checks;
  }

  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    system: SystemMetrics;
  }> {
    const [system, database, api, external] = await Promise.all([
      this.collectSystemMetrics(),
      this.checkDatabaseHealth(),
      this.checkAPIHealth(),
      this.checkExternalServices()
    ]);
    
    const allChecks = [database, api, ...external];
    
    // Determine overall health
    const unhealthyCount = allChecks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = allChecks.filter(c => c.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }
    
    return {
      overall,
      checks: allChecks,
      system
    };
  }

  getMetricsHistory() {
    return {
      metrics: this.metricsHistory,
      averages: this.calculateAverages()
    };
  }

  private calculateAverages() {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    
    const sum = this.metricsHistory.reduce(
      (acc, metrics) => ({
        cpuUsage: acc.cpuUsage + metrics.cpu.usage,
        memoryUsage: acc.memoryUsage + metrics.memory.percentUsed
      }),
      { cpuUsage: 0, memoryUsage: 0 }
    );
    
    return {
      cpuUsage: sum.cpuUsage / this.metricsHistory.length,
      memoryUsage: sum.memoryUsage / this.metricsHistory.length
    };
  }
}

export const systemMonitor = new SystemMonitor();

// Error tracking
interface ErrorLog {
  id: string;
  error: string;
  stack?: string;
  context?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
  private errors: ErrorLog[] = [];
  private errorCounts = new Map<string, number>();

  logError(
    error: Error,
    context?: any,
    severity: ErrorLog['severity'] = 'medium'
  ): void {
    const errorLog: ErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity
    };
    
    this.errors.push(errorLog);
    
    // Update error counts
    const errorKey = error.message;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    
    // Keep only last 1000 errors
    if (this.errors.length > 1000) {
      this.errors.shift();
    }
    
    // Log critical errors
    if (severity === 'critical') {
      logger.error('ErrorTracker', 'Critical error detected', error);
    }
  }

  getErrorSummary() {
    const now = Date.now();
    const last24Hours = this.errors.filter(
      e => now - e.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    
    const bySeverity = last24Hours.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
    
    return {
      total: this.errors.length,
      last24Hours: last24Hours.length,
      bySeverity,
      topErrors
    };
  }

  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errors.slice(-limit).reverse();
  }
}

export const errorTracker = new ErrorTracker();

// Performance monitoring middleware
export async function performanceMonitoring() {
  const interval = setInterval(async () => {
    try {
      const health = await systemMonitor.performHealthCheck();
      
      if (health.overall !== 'healthy') {
        logger.warn('Monitor', `System health: ${health.overall}`, {
          checks: health.checks.filter(c => c.status !== 'healthy')
        });
      }
    } catch (error) {
      logger.error('Monitor', 'Health check failed', error as Error);
    }
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}

// Metrics aggregation for dashboards
export async function getMetricsDashboard() {
  const [health, systemHistory, dbMetrics, apiMetrics, errors] = await Promise.all([
    systemMonitor.performHealthCheck(),
    systemMonitor.getMetricsHistory(),
    Promise.resolve(dbMonitor.getMetricsSummary()),
    Promise.resolve(apiMonitor.getMetricsSummary()),
    Promise.resolve(errorTracker.getErrorSummary())
  ]);
  
  return {
    timestamp: new Date(),
    health,
    system: systemHistory,
    database: dbMetrics,
    api: apiMetrics,
    errors
  };
}