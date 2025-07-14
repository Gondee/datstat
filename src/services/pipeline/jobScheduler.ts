import { logger } from '../external/utils/logger';
import { dataIntegrationService } from '../external/dataIntegration';
import { prisma } from '@/lib/prisma';
import EventEmitter from 'events';

export interface JobConfig {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  timeout: number; // milliseconds
  priority: 'low' | 'medium' | 'high';
  category: 'crypto' | 'stocks' | 'filings' | 'metrics' | 'maintenance';
}

export interface JobExecution {
  id: string;
  jobId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'success' | 'failed' | 'timeout';
  error?: string;
  metrics?: Record<string, any>;
  retryCount: number;
}

export interface JobStats {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  lastRun?: Date;
  nextRun?: Date;
  errorRate: number;
}

class JobScheduler extends EventEmitter {
  private jobs: Map<string, JobConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private runningJobs: Map<string, JobExecution> = new Map();
  private jobStats: Map<string, JobStats> = new Map();
  private isRunning = false;
  private marketHours: { open: number; close: number } = { open: 9.5, close: 16 }; // EST hours

  constructor() {
    super();
    this.initializeDefaultJobs();
  }

  private initializeDefaultJobs(): void {
    const defaultJobs: JobConfig[] = [
      {
        id: 'crypto-prices',
        name: 'Crypto Price Updates',
        enabled: true,
        interval: 30000, // 30 seconds
        maxRetries: 3,
        timeout: 15000,
        priority: 'high',
        category: 'crypto',
      },
      {
        id: 'stock-prices',
        name: 'Stock Price Updates',
        enabled: true,
        interval: 60000, // 1 minute
        maxRetries: 3,
        timeout: 30000,
        priority: 'high',
        category: 'stocks',
      },
      {
        id: 'sec-filings',
        name: 'SEC Filings Refresh',
        enabled: true,
        interval: 3600000, // 1 hour
        maxRetries: 2,
        timeout: 120000,
        priority: 'medium',
        category: 'filings',
      },
      {
        id: 'treasury-metrics',
        name: 'Treasury Metrics Calculation',
        enabled: true,
        interval: 300000, // 5 minutes
        maxRetries: 2,
        timeout: 60000,
        priority: 'medium',
        category: 'metrics',
      },
      {
        id: 'data-cleanup',
        name: 'Data Cleanup & Maintenance',
        enabled: true,
        interval: 86400000, // 24 hours
        maxRetries: 1,
        timeout: 300000,
        priority: 'low',
        category: 'maintenance',
      },
    ];

    defaultJobs.forEach(job => this.addJob(job));
  }

  addJob(config: JobConfig): void {
    this.jobs.set(config.id, config);
    this.jobStats.set(config.id, {
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      errorRate: 0,
    });

    if (this.isRunning && config.enabled) {
      this.scheduleJob(config.id);
    }

    logger.info('JobScheduler', `Job added: ${config.name}`, {
      jobId: config.id,
      interval: config.interval,
      category: config.category,
    });
  }

  removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    this.unscheduleJob(jobId);
    this.jobs.delete(jobId);
    this.jobStats.delete(jobId);

    logger.info('JobScheduler', `Job removed: ${job.name}`, { jobId });
    return true;
  }

  updateJob(jobId: string, updates: Partial<JobConfig>): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const updatedJob = { ...job, ...updates };
    this.jobs.set(jobId, updatedJob);

    // Reschedule if interval changed
    if (updates.interval && this.isRunning && updatedJob.enabled) {
      this.unscheduleJob(jobId);
      this.scheduleJob(jobId);
    }

    logger.info('JobScheduler', `Job updated: ${updatedJob.name}`, {
      jobId,
      updates: Object.keys(updates),
    });
    return true;
  }

  private scheduleJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    // Clear existing timer
    this.unscheduleJob(jobId);

    // Calculate interval based on market hours for stock jobs
    let interval = job.interval;
    if (job.category === 'stocks') {
      interval = this.adjustIntervalForMarketHours(job.interval);
    }

    const timer = setInterval(async () => {
      await this.executeJob(jobId);
    }, interval);

    this.timers.set(jobId, timer);
    
    // Update next run time in stats
    const stats = this.jobStats.get(jobId);
    if (stats) {
      stats.nextRun = new Date(Date.now() + interval);
    }

    logger.debug('JobScheduler', `Job scheduled: ${job.name}`, {
      jobId,
      interval,
      nextRun: new Date(Date.now() + interval).toISOString(),
    });
  }

  private unscheduleJob(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }
  }

  private adjustIntervalForMarketHours(baseInterval: number): number {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    // Check if market is open (9:30 AM - 4:00 PM EST)
    const isMarketOpen = currentHour >= this.marketHours.open && currentHour < this.marketHours.close;
    
    // Check if it's a weekday
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    if (isMarketOpen && isWeekday) {
      return baseInterval; // Use normal interval during market hours
    } else {
      return baseInterval * 5; // Reduce frequency outside market hours
    }
  }

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    // Check if job is already running
    if (this.runningJobs.has(jobId)) {
      logger.warn('JobScheduler', `Job already running, skipping: ${job.name}`, { jobId });
      return;
    }

    const execution: JobExecution = {
      id: `${jobId}_${Date.now()}`,
      jobId,
      startTime: new Date(),
      status: 'running',
      retryCount: 0,
    };

    this.runningJobs.set(jobId, execution);
    this.emit('jobStarted', { jobId, execution });

    logger.info('JobScheduler', `Executing job: ${job.name}`, {
      jobId,
      executionId: execution.id,
    });

    try {
      const result = await this.runJobWithTimeout(job);
      
      execution.endTime = new Date();
      execution.status = 'success';
      execution.metrics = result;

      this.updateJobStats(jobId, execution);
      this.emit('jobCompleted', { jobId, execution });

      logger.info('JobScheduler', `Job completed successfully: ${job.name}`, {
        jobId,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
        metrics: result,
      });

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = (error as Error).message;

      // Retry logic
      if (execution.retryCount < job.maxRetries) {
        execution.retryCount++;
        logger.warn('JobScheduler', `Job failed, retrying: ${job.name}`, {
          jobId,
          retryCount: execution.retryCount,
          maxRetries: job.maxRetries,
          error: execution.error,
        });

        // Schedule retry with exponential backoff
        setTimeout(() => {
          this.runningJobs.delete(jobId);
          this.executeJob(jobId);
        }, Math.pow(2, execution.retryCount) * 1000);
        return;
      }

      this.updateJobStats(jobId, execution);
      this.emit('jobFailed', { jobId, execution });

      logger.error('JobScheduler', `Job failed after max retries: ${job.name}`, {
        jobId,
        error: execution.error,
        retryCount: execution.retryCount,
      });
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  private async runJobWithTimeout(job: JobConfig): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job timeout after ${job.timeout}ms`));
      }, job.timeout);

      try {
        const result = await this.executeJobLogic(job);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async executeJobLogic(job: JobConfig): Promise<any> {
    switch (job.id) {
      case 'crypto-prices':
        await dataIntegrationService.refreshCryptoPrices();
        return { type: 'crypto', refreshed: true };

      case 'stock-prices':
        await dataIntegrationService.refreshStockPrices();
        return { type: 'stocks', refreshed: true };

      case 'sec-filings':
        await dataIntegrationService.refreshFilings();
        return { type: 'filings', refreshed: true };

      case 'treasury-metrics':
        return await this.calculateTreasuryMetrics();

      case 'data-cleanup':
        return await this.performDataCleanup();

      default:
        throw new Error(`Unknown job type: ${job.id}`);
    }
  }

  private async calculateTreasuryMetrics(): Promise<any> {
    const companies = await prisma.company.findMany({
      include: {
        treasuryHoldings: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let updatedCount = 0;
    for (const company of companies) {
      try {
        const treasuryValue = company.treasuryHoldings.reduce(
          (total, holding) => total + holding.currentValue,
          0
        );

        const stockPrice = company.marketData[0]?.price || 0;
        const navPerShare = (company.shareholdersEquity + treasuryValue) / company.sharesOutstanding;
        const premiumToNav = stockPrice > 0 ? ((stockPrice / navPerShare) - 1) * 100 : 0;

        await prisma.historicalMetric.create({
          data: {
            companyId: company.id,
            date: new Date(),
            stockPrice,
            treasuryValue,
            navPerShare,
            premiumToNav,
            volume: company.marketData[0]?.volume24h || 0,
            sharesOutstanding: company.sharesOutstanding,
            sharesDiluted: company.sharesOutstanding, // Simplified for now
          },
        });

        updatedCount++;
      } catch (error) {
        logger.warn('JobScheduler', `Failed to calculate metrics for ${company.ticker}`, {
          error: (error as Error).message,
        });
      }
    }

    return { type: 'metrics', companiesUpdated: updatedCount };
  }

  private async performDataCleanup(): Promise<any> {
    // Clean up old market data (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedMarketData = await prisma.marketData.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
    });

    // Clean up old historical metrics (keep last 365 days)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    const deletedMetrics = await prisma.historicalMetric.deleteMany({
      where: {
        date: {
          lt: oneYearAgo,
        },
      },
    });

    return {
      type: 'cleanup',
      deletedMarketData: deletedMarketData.count,
      deletedMetrics: deletedMetrics.count,
    };
  }

  private updateJobStats(jobId: string, execution: JobExecution): void {
    const stats = this.jobStats.get(jobId);
    if (!stats) return;

    stats.totalRuns++;
    stats.lastRun = execution.startTime;

    if (execution.status === 'success') {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }

    if (execution.endTime) {
      const executionTime = execution.endTime.getTime() - execution.startTime.getTime();
      stats.averageExecutionTime = (stats.averageExecutionTime * (stats.totalRuns - 1) + executionTime) / stats.totalRuns;
    }

    stats.errorRate = (stats.failureCount / stats.totalRuns) * 100;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('JobScheduler', 'Scheduler already running');
      return;
    }

    this.isRunning = true;
    
    // Schedule all enabled jobs
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        this.scheduleJob(jobId);
      }
    }

    logger.info('JobScheduler', 'Job scheduler started', {
      totalJobs: this.jobs.size,
      enabledJobs: Array.from(this.jobs.values()).filter(j => j.enabled).length,
    });

    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Clear all timers
    for (const [jobId, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();

    // Wait for running jobs to complete (with timeout)
    const runningJobIds = Array.from(this.runningJobs.keys());
    if (runningJobIds.length > 0) {
      logger.info('JobScheduler', `Waiting for ${runningJobIds.length} running jobs to complete`);
    }

    logger.info('JobScheduler', 'Job scheduler stopped');
    this.emit('stopped');
  }

  getJobStatus(jobId: string): any {
    const job = this.jobs.get(jobId);
    const stats = this.jobStats.get(jobId);
    const isRunning = this.runningJobs.has(jobId);

    if (!job || !stats) return null;

    return {
      config: job,
      stats,
      isRunning,
      isScheduled: this.timers.has(jobId),
    };
  }

  getAllJobStatuses(): any[] {
    return Array.from(this.jobs.keys()).map(jobId => this.getJobStatus(jobId));
  }

  enableJob(jobId: string): boolean {
    const success = this.updateJob(jobId, { enabled: true });
    if (success && this.isRunning) {
      this.scheduleJob(jobId);
    }
    return success;
  }

  disableJob(jobId: string): boolean {
    const success = this.updateJob(jobId, { enabled: false });
    if (success) {
      this.unscheduleJob(jobId);
    }
    return success;
  }

  triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    logger.info('JobScheduler', `Manually triggering job: ${job.name}`, { jobId });
    return this.executeJob(jobId);
  }

  getRunningJobs(): string[] {
    return Array.from(this.runningJobs.keys());
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler();
export default JobScheduler;