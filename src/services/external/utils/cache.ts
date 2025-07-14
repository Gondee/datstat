import { CacheEntry } from '../types';
import { logger } from './logger';

export interface CacheStats {
  size: number;
  keys: string[];
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  memoryUsage: number;
}

export interface CacheOptions {
  defaultTTL?: number; // seconds
  maxSize?: number;
  cleanupInterval?: number; // milliseconds
  enableWarming?: boolean;
  enableStats?: boolean;
}

export interface WarmupStrategy {
  key: string;
  warmupFunction: () => Promise<any>;
  interval: number; // milliseconds
  priority: 'low' | 'medium' | 'high';
}

class IntelligentCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessTimes: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private warmupStrategies: Map<string, WarmupStrategy> = new Map();
  private warmupTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL || 300, // 5 minutes
      maxSize: options.maxSize || 1000,
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      enableWarming: options.enableWarming ?? true,
      enableStats: options.enableStats ?? true,
    };

    // Cleanup expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    logger.info('Cache', 'Intelligent cache initialized', this.options);
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds || this.options.defaultTTL) * 1000;
    
    // Check if we need to evict items to stay under maxSize
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    logger.debug('Cache', `Set cache entry: ${key}`, { ttl: ttl / 1000 });
  }

  get<T>(key: string): T | null {
    if (this.options.enableStats) {
      this.stats.hits = this.stats.hits || 0;
      this.stats.misses = this.stats.misses || 0;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      if (this.options.enableStats) this.stats.misses++;
      logger.debug('Cache', `Cache miss: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      if (this.options.enableStats) this.stats.misses++;
      logger.debug('Cache', `Cache expired: ${key}`);
      return null;
    }

    // Update access tracking
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
    
    if (this.options.enableStats) this.stats.hits++;
    logger.debug('Cache', `Cache hit: ${key}`);
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    this.accessTimes.delete(key);
    this.accessCounts.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    this.clearAllWarmups();
  }

  // Intelligent cache features
  
  private evictLeastUsed(): void {
    if (this.cache.size === 0) return;

    let leastUsedKey = '';
    let leastUsedScore = Infinity;

    for (const [key] of this.cache) {
      const accessCount = this.accessCounts.get(key) || 0;
      const lastAccess = this.accessTimes.get(key) || 0;
      const age = Date.now() - lastAccess;
      
      // Score based on access frequency and recency (lower is worse)
      const score = accessCount / (age / 1000); // accesses per second since last use
      
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
      logger.debug('Cache', `Evicted least used key: ${leastUsedKey}`, { score: leastUsedScore });
    }
  }

  // Cache warming strategies
  addWarmupStrategy(strategy: WarmupStrategy): void {
    if (!this.options.enableWarming) {
      logger.warn('Cache', 'Warmup not enabled, ignoring strategy', { key: strategy.key });
      return;
    }

    this.warmupStrategies.set(strategy.key, strategy);
    this.scheduleWarmup(strategy);
    logger.info('Cache', `Added warmup strategy: ${strategy.key}`, { interval: strategy.interval });
  }

  removeWarmupStrategy(key: string): void {
    const timer = this.warmupTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.warmupTimers.delete(key);
    }
    this.warmupStrategies.delete(key);
    logger.info('Cache', `Removed warmup strategy: ${key}`);
  }

  private scheduleWarmup(strategy: WarmupStrategy): void {
    const timer = setInterval(async () => {
      try {
        logger.debug('Cache', `Warming up cache: ${strategy.key}`);
        const data = await strategy.warmupFunction();
        this.set(strategy.key, data);
        logger.debug('Cache', `Cache warmed: ${strategy.key}`);
      } catch (error) {
        logger.error('Cache', `Warmup failed: ${strategy.key}`, error as Error);
      }
    }, strategy.interval);

    this.warmupTimers.set(strategy.key, timer);
  }

  private clearAllWarmups(): void {
    for (const timer of this.warmupTimers.values()) {
      clearInterval(timer);
    }
    this.warmupTimers.clear();
    this.warmupStrategies.clear();
  }

  // Advanced cache operations
  
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    return factory().then(data => {
      this.set(key, data, ttlSeconds);
      return data;
    });
  }

  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  setMultiple<T>(entries: Record<string, T>, ttlSeconds?: number): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttlSeconds);
    }
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }
    
    logger.info('Cache', `Invalidated ${count} entries matching pattern: ${pattern}`);
    return count;
  }

  refresh<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    this.delete(key);
    return factory().then(data => {
      this.set(key, data, ttlSeconds);
      return data;
    });
  }

  // Time-based operations
  
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return Date.now() - entry.timestamp > entry.ttl;
  }

  getTimeToExpire(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const remaining = entry.ttl - (Date.now() - entry.timestamp);
    return Math.max(0, remaining);
  }

  extend(key: string, additionalTTLSeconds: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    entry.ttl += additionalTTLSeconds * 1000;
    logger.debug('Cache', `Extended TTL for key: ${key}`, { additionalSeconds: additionalTTLSeconds });
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug('Cache', `Cleaned up ${cleanedCount} expired entries`);
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // string size in bytes (UTF-16)
      memoryUsage += JSON.stringify(entry.data).length * 2; // rough data size
      memoryUsage += 32; // overhead for timestamp, ttl, etc.
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      memoryUsage,
    };
  }

  // Utility methods
  
  getTopAccessedKeys(limit: number = 10): Array<{ key: string; count: number; lastAccess: Date }> {
    return Array.from(this.accessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => ({
        key,
        count,
        lastAccess: new Date(this.accessTimes.get(key) || 0),
      }));
  }

  getExpiringSoon(withinSeconds: number = 300): Array<{ key: string; expiresIn: number }> {
    const now = Date.now();
    const threshold = withinSeconds * 1000;
    const expiring: Array<{ key: string; expiresIn: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const expiresIn = entry.ttl - (now - entry.timestamp);
      if (expiresIn > 0 && expiresIn <= threshold) {
        expiring.push({
          key,
          expiresIn: Math.floor(expiresIn / 1000),
        });
      }
    }

    return expiring.sort((a, b) => a.expiresIn - b.expiresIn);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAllWarmups();
    this.clear();
    logger.info('Cache', 'Cache destroyed');
  }
}

// Create and export intelligent cache instance with crypto/stocks warming strategies
export const cache = new IntelligentCache({
  defaultTTL: 300, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableWarming: true,
  enableStats: true,
});

// Add warmup strategies for frequently accessed data
cache.addWarmupStrategy({
  key: 'crypto:prices:all',
  warmupFunction: async () => {
    // This would be imported from coin gecko service
    // return await coinGeckoService.getAllCryptoPrices();
    return {}; // Placeholder
  },
  interval: 60000, // 1 minute
  priority: 'high',
});

cache.addWarmupStrategy({
  key: 'stock:prices:treasury',
  warmupFunction: async () => {
    // This would be imported from alpha vantage service
    // return await alphaVantageService.getMultipleStockQuotes(['MSTR', 'DFDV', 'UPXI', 'SBET']);
    return {}; // Placeholder
  },
  interval: 120000, // 2 minutes
  priority: 'high',
});

export default IntelligentCache;