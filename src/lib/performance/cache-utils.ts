// LRU Cache implementation for in-memory caching
export class LRUCache<K, V> {
  private cache: Map<K, { value: V; expiry: number }> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  set(key: K, value: V, ttl?: number): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    let expired = 0;
    const now = Date.now();
    
    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expired++;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      utilization: this.cache.size / this.maxSize
    };
  }
}

// Multi-tier cache system
export class TieredCache<K, V> {
  private l1Cache: LRUCache<K, V>;
  private l2Cache: LRUCache<K, V>;
  private l1TTL: number;
  private l2TTL: number;

  constructor(
    l1Size: number = 100,
    l2Size: number = 1000,
    l1TTL: number = 60000, // 1 minute
    l2TTL: number = 300000 // 5 minutes
  ) {
    this.l1Cache = new LRUCache(l1Size, l1TTL);
    this.l2Cache = new LRUCache(l2Size, l2TTL);
    this.l1TTL = l1TTL;
    this.l2TTL = l2TTL;
  }

  async get(key: K, fetchFn?: () => Promise<V>): Promise<V | undefined> {
    // Check L1 cache
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // Check L2 cache
    value = this.l2Cache.get(key);
    if (value !== undefined) {
      // Promote to L1
      this.l1Cache.set(key, value, this.l1TTL);
      return value;
    }
    
    // Fetch if function provided
    if (fetchFn) {
      value = await fetchFn();
      if (value !== undefined) {
        this.set(key, value);
      }
      return value;
    }
    
    return undefined;
  }

  set(key: K, value: V, options?: { l1Only?: boolean; l2Only?: boolean }): void {
    if (!options?.l2Only) {
      this.l1Cache.set(key, value, this.l1TTL);
    }
    
    if (!options?.l1Only) {
      this.l2Cache.set(key, value, this.l2TTL);
    }
  }

  invalidate(key: K): void {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
  }

  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }

  getStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache.getStats()
    };
  }
}

// Cache key generator for consistent caching
export class CacheKeyGenerator {
  static generate(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  static generateForQuery(model: string, operation: string, params: any): string {
    return this.generate(`db:${model}:${operation}`, params || {});
  }

  static generateForAPI(endpoint: string, params: any): string {
    return this.generate(`api:${endpoint}`, params || {});
  }
}

// Response caching middleware for API routes
export class ResponseCache {
  private cache: TieredCache<string, any>;

  constructor() {
    this.cache = new TieredCache(
      100,  // L1 size
      500,  // L2 size
      30000, // L1 TTL: 30 seconds
      300000 // L2 TTL: 5 minutes
    );
  }

  async getCachedResponse<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: {
      ttl?: number;
      tags?: string[];
      revalidate?: boolean;
    }
  ): Promise<T> {
    if (options?.revalidate) {
      this.cache.invalidate(key);
    }
    
    return await this.cache.get(key, fetchFn) as T;
  }

  invalidateByTags(tags: string[]): void {
    // In a real implementation, this would track tags
    // For now, we'll clear the entire cache
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Global cache instances
export const apiCache = new ResponseCache();
export const queryCache = new TieredCache<string, any>(200, 1000);
export const calculationCache = new LRUCache<string, any>(500, 120000); // 2 minutes