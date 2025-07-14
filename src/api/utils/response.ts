import { NextResponse } from 'next/server';
import { ApiResponse, ApiMeta, ApiError, RateLimitMeta } from '../types';

export class ApiResponseBuilder {
  static success<T>(
    data: T,
    options?: {
      meta?: Partial<ApiMeta>;
      status?: number;
      headers?: Record<string, string>;
    }
  ): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        ...options?.meta,
      },
    };

    return NextResponse.json(response, {
      status: options?.status || 200,
      headers: options?.headers,
    });
  }

  static error(
    error: Omit<ApiError, 'timestamp'>,
    options?: {
      status?: number;
      meta?: Partial<ApiMeta>;
      headers?: Record<string, string>;
    }
  ): NextResponse {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        ...error,
        timestamp: new Date().toISOString(),
      },
      meta: {
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        ...options?.meta,
      },
    };

    return NextResponse.json(response, {
      status: options?.status || 400,
      headers: options?.headers,
    });
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    options?: {
      meta?: Partial<ApiMeta>;
      headers?: Record<string, string>;
    }
  ): NextResponse {
    const hasNext = pagination.page * pagination.limit < pagination.total;
    const hasPrev = pagination.page > 1;

    const response: ApiResponse<T[]> = {
      success: true,
      data,
      meta: {
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          hasNext,
          hasPrev,
        },
        ...options?.meta,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: options?.headers,
    });
  }

  static withRateLimit<T>(
    data: T,
    rateLimit: RateLimitMeta,
    options?: {
      meta?: Partial<ApiMeta>;
      status?: number;
    }
  ): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        rateLimit,
        ...options?.meta,
      },
    };

    return NextResponse.json(response, {
      status: options?.status || 200,
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset.toString(),
      },
    });
  }

  static notFound(resource: string): NextResponse {
    return this.error(
      {
        code: 'NOT_FOUND',
        message: `${resource} not found`,
      },
      { status: 404 }
    );
  }

  static unauthorized(message?: string): NextResponse {
    return this.error(
      {
        code: 'UNAUTHORIZED',
        message: message || 'Unauthorized',
      },
      { status: 401 }
    );
  }

  static forbidden(message?: string): NextResponse {
    return this.error(
      {
        code: 'FORBIDDEN',
        message: message || 'Forbidden',
      },
      { status: 403 }
    );
  }

  static badRequest(message: string, details?: any): NextResponse {
    return this.error(
      {
        code: 'BAD_REQUEST',
        message,
        details,
      },
      { status: 400 }
    );
  }

  static internalError(message?: string): NextResponse {
    return this.error(
      {
        code: 'INTERNAL_ERROR',
        message: message || 'Internal server error',
      },
      { status: 500 }
    );
  }

  static serviceUnavailable(message?: string): NextResponse {
    return this.error(
      {
        code: 'SERVICE_UNAVAILABLE',
        message: message || 'Service temporarily unavailable',
      },
      { status: 503 }
    );
  }
}

// Common error responses
export const ErrorResponses = {
  INVALID_INPUT: (details?: any) =>
    ApiResponseBuilder.badRequest('Invalid input provided', details),
  
  MISSING_REQUIRED_FIELD: (field: string) =>
    ApiResponseBuilder.badRequest(`Missing required field: ${field}`),
  
  INVALID_FORMAT: (field: string, expected: string) =>
    ApiResponseBuilder.badRequest(`Invalid format for ${field}. Expected: ${expected}`),
  
  RATE_LIMIT_EXCEEDED: (retryAfter: number) =>
    ApiResponseBuilder.error(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: { retryAfter },
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
        },
      }
    ),
  
  DATABASE_ERROR: () =>
    ApiResponseBuilder.internalError('Database operation failed'),
  
  EXTERNAL_SERVICE_ERROR: (service: string) =>
    ApiResponseBuilder.serviceUnavailable(`External service unavailable: ${service}`),
};