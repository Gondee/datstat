import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { logApiRequest } from '../middleware/logging';
import { ApiResponseBuilder } from '../utils/response';

export interface ApiRoute {
  path: string;
  method: string;
  handler: (req: NextRequest, params?: any) => Promise<NextResponse>;
  auth?: {
    required?: boolean;
    scopes?: string[];
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  version?: string;
}

export class ApiRouter {
  private routes: Map<string, ApiRoute> = new Map();

  register(route: ApiRoute) {
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);
  }

  async handle(req: NextRequest): Promise<NextResponse> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Find matching route
    const route = this.findRoute(method, path);
    if (!route) {
      return ApiResponseBuilder.notFound('Route');
    }

    // Apply middleware
    return logApiRequest(req, async () => {
      // Rate limiting
      if (route.rateLimit) {
        const { allowed, error } = await rateLimit(req, route.rateLimit);
        if (!allowed && error) {
          return NextResponse.json(error, { status: 429 });
        }
      }

      // Authentication
      if (route.auth?.required !== false) {
        const { user, apiKey, error } = await authenticate(req, {
          requireAuth: route.auth?.required,
          scopes: route.auth?.scopes,
        });

        if (error) {
          return NextResponse.json(error, { status: 401 });
        }

        // Add auth info to request
        (req as any).user = user;
        (req as any).apiKey = apiKey;
      }

      // Execute handler
      try {
        const params = this.extractParams(route.path, path);
        return await route.handler(req, params);
      } catch (error) {
        console.error('Route handler error:', error);
        return ApiResponseBuilder.internalError();
      }
    });
  }

  private findRoute(method: string, path: string): ApiRoute | undefined {
    // Direct match
    const directKey = `${method}:${path}`;
    if (this.routes.has(directKey)) {
      return this.routes.get(directKey);
    }

    // Pattern matching (e.g., /api/companies/:ticker)
    for (const [key, route] of this.routes) {
      const [routeMethod, routePath] = key.split(':');
      if (routeMethod !== method) continue;

      const pattern = this.pathToRegex(routePath);
      if (pattern.test(path)) {
        return route;
      }
    }

    return undefined;
  }

  private pathToRegex(path: string): RegExp {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '([^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  private extractParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].substring(1);
        params[paramName] = actualParts[i];
      }
    }

    return params;
  }
}

// Global router instance
export const apiRouter = new ApiRouter();

// Helper to create route handlers
export function createApiHandler(
  routes: ApiRoute[]
): (req: NextRequest) => Promise<NextResponse> {
  const router = new ApiRouter();
  routes.forEach((route) => router.register(route));
  
  return (req: NextRequest) => router.handle(req);
}

// Version-aware routing
export function versionedRoute(
  baseRoute: ApiRoute,
  versions: Record<string, (req: NextRequest, params?: any) => Promise<NextResponse>>
): ApiRoute[] {
  return Object.entries(versions).map(([version, handler]) => ({
    ...baseRoute,
    path: `/api/${version}${baseRoute.path}`,
    handler,
    version,
  }));
}