import { logger } from '../external/utils/logger';
import EventEmitter from 'events';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringWindow: number; // milliseconds
  expectedErrors?: (error: Error) => boolean;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface BulkheadOptions {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number; // milliseconds
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: Date;
}

class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;
  private recentCalls: { timestamp: number; success: boolean }[] = [];
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {
    super();
    this.startMonitoring();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttempt && Date.now() < this.nextAttempt.getTime()) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { name: this.name, state: this.state });
        logger.info('CircuitBreaker', `${this.name} moved to HALF_OPEN`);
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  private onSuccess(latency: number): void {
    this.successes++;
    this.addCall(true);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      this.emit('stateChange', { name: this.name, state: this.state });
      logger.info('CircuitBreaker', `${this.name} moved to CLOSED after success`);
    }

    this.emit('success', { name: this.name, latency });
  }

  private onFailure(error: Error, latency: number): void {
    // Check if this is an expected error that shouldn't count as failure
    if (this.options.expectedErrors && this.options.expectedErrors(error)) {
      this.emit('expectedError', { name: this.name, error, latency });
      return;
    }

    this.failures++;
    this.lastFailureTime = new Date();
    this.addCall(false);

    const failureRate = this.getFailureRate();
    
    if (this.state === CircuitState.HALF_OPEN || 
        (this.state === CircuitState.CLOSED && failureRate >= this.options.failureThreshold)) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
      this.emit('stateChange', { name: this.name, state: this.state });
      logger.warn('CircuitBreaker', `${this.name} moved to OPEN`, {
        failures: this.failures,
        failureRate,
        threshold: this.options.failureThreshold,
      });
    }

    this.emit('failure', { name: this.name, error, latency, failureRate });
  }

  private addCall(success: boolean): void {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success });
    
    // Remove calls outside monitoring window
    const cutoff = now - this.options.monitoringWindow;
    this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoff);
  }

  private getFailureRate(): number {
    if (this.recentCalls.length === 0) return 0;
    
    const failures = this.recentCalls.filter(call => !call.success).length;
    return failures / this.recentCalls.length;
  }

  private startMonitoring(): void {
    // Clean up old calls every minute
    setInterval(() => {
      const cutoff = Date.now() - this.options.monitoringWindow;
      this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoff);
    }, 60000);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    failureRate: number;
    recentCalls: number;
    lastFailureTime?: Date;
    nextAttempt?: Date;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      failureRate: this.getFailureRate(),
      recentCalls: this.recentCalls.length,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.recentCalls = [];
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
    this.emit('reset', { name: this.name });
    logger.info('CircuitBreaker', `${this.name} manually reset`);
  }
}

class RetryPolicy {
  constructor(private options: RetryOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (this.options.retryCondition && !this.options.retryCondition(lastError)) {
          throw lastError;
        }
        
        // Don't wait after the last attempt
        if (attempt === this.options.maxAttempts) {
          break;
        }
        
        const delay = this.calculateDelay(attempt);
        logger.debug('RetryPolicy', `Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.options.maxDelay);
    
    if (this.options.jitter) {
      // Add ±25% jitter
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class Bulkhead {
  private running: number = 0;
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
  }> = [];

  constructor(
    private name: string,
    private options: BulkheadOptions
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = {
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      if (this.running < this.options.maxConcurrent) {
        this.runTask(task);
      } else if (this.queue.length < this.options.maxQueueSize) {
        this.queue.push(task);
      } else {
        reject(new Error(`Bulkhead ${this.name} queue is full`));
      }
    });
  }

  private async runTask(task: any): Promise<void> {
    this.running++;
    
    const timeout = setTimeout(() => {
      task.reject(new Error(`Bulkhead ${this.name} operation timed out`));
    }, this.options.timeout);

    try {
      const result = await task.operation();
      clearTimeout(timeout);
      task.resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      task.reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    // Remove expired tasks from queue
    const now = Date.now();
    this.queue = this.queue.filter(task => {
      if (now - task.timestamp > this.options.timeout) {
        task.reject(new Error(`Bulkhead ${this.name} task expired in queue`));
        return false;
      }
      return true;
    });

    // Start next task if possible
    if (this.running < this.options.maxConcurrent && this.queue.length > 0) {
      const nextTask = this.queue.shift()!;
      this.runTask(nextTask);
    }
  }

  getStats(): {
    running: number;
    queued: number;
    utilization: number;
  } {
    return {
      running: this.running,
      queued: this.queue.length,
      utilization: this.running / this.options.maxConcurrent,
    };
  }
}

class HealthChecker {
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private checkInterval?: NodeJS.Timeout;

  constructor(private intervalMs: number = 30000) {}

  registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
    logger.info('HealthChecker', `Registered health check: ${name}`);
  }

  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
    logger.info('HealthChecker', `Unregistered health check: ${name}`);
  }

  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const check = this.healthChecks.get(name);
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await check();
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
        timestamp: new Date(),
      };
      this.lastResults.set(name, result);
      return result;
    }
  }

  async runAllHealthChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    
    const promises = Array.from(this.healthChecks.keys()).map(async (name) => {
      try {
        const result = await this.runHealthCheck(name);
        results.set(name, result);
      } catch (error) {
        results.set(name, {
          healthy: false,
          latency: 0,
          error: (error as Error).message,
          timestamp: new Date(),
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  getLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastResults);
  }

  isHealthy(name?: string): boolean {
    if (name) {
      const result = this.lastResults.get(name);
      return result?.healthy ?? false;
    }
    
    // Check if all services are healthy
    return Array.from(this.lastResults.values()).every(result => result.healthy);
  }

  startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      await this.runAllHealthChecks();
    }, this.intervalMs);
    
    logger.info('HealthChecker', 'Started health monitoring', { interval: this.intervalMs });
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    
    logger.info('HealthChecker', 'Stopped health monitoring');
  }
}

// Combined resilience service
class ResilienceService extends EventEmitter {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private healthChecker: HealthChecker;

  constructor() {
    super();
    this.healthChecker = new HealthChecker();
    this.setupDefaultPolicies();
    this.startMonitoring();
  }

  private setupDefaultPolicies(): void {
    // Default circuit breaker for external APIs
    this.addCircuitBreaker('external_api', {
      failureThreshold: 0.5, // 50% failure rate
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 120000, // 2 minutes
      expectedErrors: (error) => error.message.includes('timeout'),
    });

    // Default retry policy for network operations
    this.addRetryPolicy('network', {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry on network errors but not on authentication errors
        return !error.message.toLowerCase().includes('unauthorized');
      },
    });

    // Default bulkhead for database operations
    this.addBulkhead('database', {
      maxConcurrent: 10,
      maxQueueSize: 50,
      timeout: 30000, // 30 seconds
    });

    logger.info('ResilienceService', 'Default policies configured');
  }

  addCircuitBreaker(name: string, options: CircuitBreakerOptions): void {
    const circuitBreaker = new CircuitBreaker(name, options);
    
    circuitBreaker.on('stateChange', (event) => {
      this.emit('circuitBreakerStateChange', event);
    });
    
    circuitBreaker.on('failure', (event) => {
      this.emit('circuitBreakerFailure', event);
    });

    this.circuitBreakers.set(name, circuitBreaker);
    logger.info('ResilienceService', `Added circuit breaker: ${name}`);
  }

  addRetryPolicy(name: string, options: RetryOptions): void {
    this.retryPolicies.set(name, new RetryPolicy(options));
    logger.info('ResilienceService', `Added retry policy: ${name}`);
  }

  addBulkhead(name: string, options: BulkheadOptions): void {
    this.bulkheads.set(name, new Bulkhead(name, options));
    logger.info('ResilienceService', `Added bulkhead: ${name}`);
  }

  async executeWithResilience<T>(
    operation: () => Promise<T>,
    policies?: {
      circuitBreaker?: string;
      retry?: string;
      bulkhead?: string;
    }
  ): Promise<T> {
    let wrappedOperation = operation;

    // Apply bulkhead if specified
    if (policies?.bulkhead) {
      const bulkhead = this.bulkheads.get(policies.bulkhead);
      if (bulkhead) {
        const originalOp = wrappedOperation;
        wrappedOperation = () => bulkhead.execute(originalOp);
      }
    }

    // Apply retry policy if specified
    if (policies?.retry) {
      const retryPolicy = this.retryPolicies.get(policies.retry);
      if (retryPolicy) {
        const originalOp = wrappedOperation;
        wrappedOperation = () => retryPolicy.execute(originalOp);
      }
    }

    // Apply circuit breaker if specified
    if (policies?.circuitBreaker) {
      const circuitBreaker = this.circuitBreakers.get(policies.circuitBreaker);
      if (circuitBreaker) {
        const originalOp = wrappedOperation;
        wrappedOperation = () => circuitBreaker.execute(originalOp);
      }
    }

    return wrappedOperation();
  }

  // Health check management
  registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecker.registerHealthCheck(name, check);
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    checks: Record<string, HealthCheckResult>;
    circuitBreakers: Record<string, any>;
    bulkheads: Record<string, any>;
  }> {
    const healthResults = await this.healthChecker.runAllHealthChecks();
    const checks: Record<string, HealthCheckResult> = {};
    
    for (const [name, result] of healthResults) {
      checks[name] = result;
    }

    const circuitBreakers: Record<string, any> = {};
    for (const [name, cb] of this.circuitBreakers) {
      circuitBreakers[name] = cb.getStats();
    }

    const bulkheads: Record<string, any> = {};
    for (const [name, bulkhead] of this.bulkheads) {
      bulkheads[name] = bulkhead.getStats();
    }

    return {
      healthy: this.healthChecker.isHealthy(),
      checks,
      circuitBreakers,
      bulkheads,
    };
  }

  private startMonitoring(): void {
    this.healthChecker.startMonitoring();
    
    // Set up default health checks
    this.registerHealthCheck('database', async () => {
      const startTime = Date.now();
      // Simplified database health check
      return {
        healthy: true,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    });

    this.registerHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const memoryLimit = 1024 * 1024 * 1024; // 1GB limit
      
      return {
        healthy: memUsage.heapUsed < memoryLimit,
        latency: 0,
        timestamp: new Date(),
        error: memUsage.heapUsed >= memoryLimit ? 'Memory usage too high' : undefined,
      };
    });
  }

  stop(): void {
    this.healthChecker.stopMonitoring();
    logger.info('ResilienceService', 'Stopped');
  }
}

// Singleton instance
export const resilienceService = new ResilienceService();
export { CircuitBreaker, RetryPolicy, Bulkhead, HealthChecker };
export default ResilienceService;