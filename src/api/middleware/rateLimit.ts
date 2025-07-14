import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, RateLimitMeta } from '../types';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (should be replaced with Redis in production)
const rateLimitStore: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
  skip?: (req: NextRequest) => boolean;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req) => {
    // Use IP address or API key as identifier
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) return `api:${apiKey}`;
    
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `ip:${ip}`;
  },
  skip: () => false,
};

export async function rateLimit(
  req: NextRequest,
  options?: RateLimitOptions
): Promise<{ allowed: boolean; rateLimitMeta: RateLimitMeta; error?: ApiResponse<null> }> {
  const config = { ...defaultOptions, ...options };

  // Skip rate limiting if configured
  if (config.skip && config.skip(req)) {
    return {
      allowed: true,
      rateLimitMeta: {
        limit: config.max!,
        remaining: config.max!,
        reset: Date.now() + config.windowMs!,
      },
    };
  }

  const key = config.keyGenerator!(req);
  const now = Date.now();
  const windowStart = now - config.windowMs!;

  // Clean up old entries
  Object.keys(rateLimitStore).forEach((k) => {
    if (rateLimitStore[k].resetTime < now) {
      delete rateLimitStore[k];
    }
  });

  // Get or create rate limit entry
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + config.windowMs!,
    };
  }

  const entry = rateLimitStore[key];
  entry.count++;

  const rateLimitMeta: RateLimitMeta = {
    limit: config.max!,
    remaining: Math.max(0, config.max! - entry.count),
    reset: entry.resetTime,
  };

  if (entry.count > config.max!) {
    return {
      allowed: false,
      rateLimitMeta,
      error: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          version: 'v1',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          rateLimit: rateLimitMeta,
        },
      },
    };
  }

  return {
    allowed: true,
    rateLimitMeta,
  };
}

// Custom rate limits for different API tiers
export const rateLimitTiers = {
  free: {
    windowMs: 60 * 1000,
    max: 60, // 60 requests per minute
  },
  basic: {
    windowMs: 60 * 1000,
    max: 300, // 300 requests per minute
  },
  pro: {
    windowMs: 60 * 1000,
    max: 1000, // 1000 requests per minute
  },
  enterprise: {
    windowMs: 60 * 1000,
    max: 5000, // 5000 requests per minute
  },
};

// Rate limit by API key tier
export async function rateLimitByTier(
  req: NextRequest,
  tier: keyof typeof rateLimitTiers = 'free'
): Promise<{ allowed: boolean; rateLimitMeta: RateLimitMeta; error?: ApiResponse<null> }> {
  return rateLimit(req, rateLimitTiers[tier]);
}