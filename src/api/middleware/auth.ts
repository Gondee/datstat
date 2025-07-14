import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ApiResponse, ApiKey } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends NextRequest {
  user?: any;
  apiKey?: ApiKey;
}

// JWT Authentication middleware
export async function authenticateJWT(
  req: NextRequest
): Promise<{ user?: any; error?: ApiResponse<null> }> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        error: {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        permissions: true,
      },
    });

    if (!user) {
      return {
        error: {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    return { user };
  } catch (error) {
    return {
      error: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

// API Key Authentication middleware
export async function authenticateApiKey(
  req: NextRequest
): Promise<{ apiKey?: ApiKey; error?: ApiResponse<null> }> {
  try {
    const apiKeyHeader = req.headers.get('x-api-key');
    if (!apiKeyHeader) {
      return {
        error: {
          success: false,
          error: {
            code: 'API_KEY_REQUIRED',
            message: 'API key required',
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: apiKeyHeader },
      include: { user: true },
    });

    if (!apiKey || !apiKey.active) {
      return {
        error: {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or inactive API key',
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return {
        error: {
          success: false,
          error: {
            code: 'API_KEY_EXPIRED',
            message: 'API key has expired',
            timestamp: new Date().toISOString(),
          },
        },
      };
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    return {
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt.toISOString(),
        lastUsed: apiKey.lastUsed?.toISOString(),
        expiresAt: apiKey.expiresAt?.toISOString(),
        active: apiKey.active,
      },
    };
  } catch (error) {
    return {
      error: {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

// Combined authentication middleware
export async function authenticate(
  req: NextRequest,
  options?: { requireAuth?: boolean; scopes?: string[] }
): Promise<{ user?: any; apiKey?: ApiKey; error?: ApiResponse<null> }> {
  // Try JWT first
  const jwtResult = await authenticateJWT(req);
  if (jwtResult.user) {
    return { user: jwtResult.user };
  }

  // Try API key
  const apiKeyResult = await authenticateApiKey(req);
  if (apiKeyResult.apiKey) {
    // Check scopes
    if (options?.scopes) {
      const hasRequiredScopes = options.scopes.every((scope) =>
        apiKeyResult.apiKey!.scopes.includes(scope)
      );
      if (!hasRequiredScopes) {
        return {
          error: {
            success: false,
            error: {
              code: 'INSUFFICIENT_SCOPES',
              message: 'Insufficient API key scopes',
              details: { required: options.scopes, provided: apiKeyResult.apiKey.scopes },
              timestamp: new Date().toISOString(),
            },
          },
        };
      }
    }
    return { apiKey: apiKeyResult.apiKey };
  }

  // No valid authentication found
  if (options?.requireAuth !== false) {
    return {
      error: {
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  return {};
}

// Permission checking helper
export function hasPermission(
  user: any,
  permission: string
): boolean {
  if (user.role === 'admin') return true;
  return user.permissions?.includes(permission) || false;
}

// Scope checking helper
export function hasScope(
  apiKey: ApiKey,
  scope: string
): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes('*');
}