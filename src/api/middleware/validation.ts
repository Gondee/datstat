import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '../types';

export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: ApiResponse<null> }> {
  try {
    let body;
    
    // Handle different content types
    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      body = await req.json();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    } else {
      // Try to parse as JSON by default
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    return { data: result.data };
  } catch (error) {
    return {
      error: {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse request body',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data?: T; error?: ApiResponse<null> } {
  const params: Record<string, any> = {};
  
  searchParams.forEach((value, key) => {
    // Handle array parameters (e.g., ?fields=a&fields=b)
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      // Try to parse numbers
      const num = Number(value);
      params[key] = isNaN(num) ? value : num;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      error: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error.flatten(),
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  return { data: result.data };
}

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const idSchema = z.object({
  id: z.string().uuid(),
});

export const tickerSchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
});

// Company-specific schemas
export const companyQuerySchema = paginationSchema.extend({
  sector: z.string().optional(),
  minMarketCap: z.number().optional(),
  maxMarketCap: z.number().optional(),
  hasTreasury: z.boolean().optional(),
  search: z.string().optional(),
});

export const createCompanySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1),
  description: z.string().optional(),
  sector: z.string().min(1),
  marketCap: z.number().positive(),
  sharesOutstanding: z.number().positive(),
  shareholdersEquity: z.number(),
  totalDebt: z.number().min(0),
});

// Treasury-specific schemas
export const treasuryQuerySchema = paginationSchema.extend({
  ticker: z.string().optional(),
  crypto: z.enum(['BTC', 'ETH', 'SOL']).optional(),
  minHolding: z.number().optional(),
  includeTransactions: z.boolean().optional(),
});

export const treasuryTransactionSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  pricePerUnit: z.number().positive(),
  totalCost: z.number().positive(),
  type: z.enum(['purchase', 'sale', 'stake', 'unstake']),
  fundingMethod: z.enum(['equity', 'convertible_debt', 'credit_facility', 'pipe', 'at_the_market']).optional(),
  notes: z.string().optional(),
});

// Market data schemas
export const marketDataQuerySchema = paginationSchema.extend({
  symbols: z.array(z.string()).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.enum(['1m', '5m', '15m', '1h', '1d']).optional(),
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  metrics: z.array(z.string()).optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  compare: z.array(z.string()).optional(),
});

// Webhook schemas
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'company.created',
    'company.updated',
    'company.deleted',
    'treasury.updated',
    'market.alert',
    'analytics.threshold',
    'system.error',
  ])).min(1),
});

// Export schemas
export const exportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'excel', 'pdf']),
  filters: z.record(z.any()).optional(),
  template: z.string().optional(),
  options: z.record(z.any()).optional(),
});