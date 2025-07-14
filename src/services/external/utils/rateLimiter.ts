import { RateLimitConfig } from '../types';

interface RateLimitEntry {
  requests: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkRateLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      this.limits.set(identifier, {
        requests: 1,
        resetTime: now + 60000, // 1 minute from now
      });
      return true;
    }

    // Reset if time window has passed
    if (now > entry.resetTime) {
      entry.requests = 1;
      entry.resetTime = now + 60000;
      return true;
    }

    // Check if under rate limit
    if (entry.requests < this.config.requestsPerMinute) {
      entry.requests++;
      return true;
    }

    return false;
  }

  async waitForRateLimit(identifier: string): Promise<void> {
    const entry = this.limits.get(identifier);
    if (!entry) return;

    const waitTime = entry.resetTime - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.requestsPerMinute;
    }
    return Math.max(0, this.config.requestsPerMinute - entry.requests);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    return entry?.resetTime || 0;
  }
}

export default RateLimiter;