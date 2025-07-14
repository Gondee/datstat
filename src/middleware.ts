import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, hasPermission } from '@/lib/auth';
import type { Role } from '@prisma/client';
import { performanceMiddleware } from '@/lib/performance/middleware';

// Route-to-role mapping
const PROTECTED_ROUTES: Record<string, Role> = {
  '/admin': 'VIEWER',        // Basic admin access
  '/admin/companies': 'VIEWER',
  '/admin/data': 'EDITOR',   // Data management requires EDITOR
  '/admin/settings': 'ADMIN', // Settings require ADMIN
};

// Rate limiting for auth endpoints
const AUTH_RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  '/api/auth/login': { limit: 5, window: 15 * 60 * 1000 },     // 5 per 15min
  '/api/auth/register': { limit: 3, window: 60 * 60 * 1000 },  // 3 per hour
  '/api/auth/refresh': { limit: 10, window: 15 * 60 * 1000 },  // 10 per 15min
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(key);
  
  if (!current) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - current.timestamp > windowMs) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();
  
  // Get performance headers
  const perfHeaders = performanceMiddleware(request);
  
  // Apply rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const rateLimit = AUTH_RATE_LIMITS[pathname];
    if (rateLimit) {
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      const key = `${pathname}:${clientIP}`;
      
      if (!checkRateLimit(key, rateLimit.limit, rateLimit.window)) {
        return NextResponse.json(
          { success: false, message: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }
  }

  // Check if the request is for a protected route
  if (pathname.startsWith('/admin')) {
    const requiredRole = getRequiredRole(pathname);
    
    if (requiredRole) {
      // Extract JWT token from cookies or Authorization header
      const accessToken = request.cookies.get('access-token')?.value ||
                         extractBearerToken(request.headers.get('authorization'));
      
      if (!accessToken) {
        return redirectToLogin(request, 'Authentication required');
      }

      // Verify JWT token
      const payload = verifyAccessToken(accessToken);
      if (!payload) {
        return redirectToLogin(request, 'Invalid or expired token');
      }

      // Check role permissions
      if (!hasPermission(payload.role, requiredRole)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Access denied. ${requiredRole} role required.` 
          },
          { status: 403 }
        );
      }

      // Add user info to request headers for downstream use
      const response = NextResponse.next();
      response.headers.set('x-user-id', payload.userId);
      response.headers.set('x-user-role', payload.role);
      response.headers.set('x-user-email', payload.email);
      
      return response;
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Add performance headers
  perfHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Add response time header
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
  
  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const frontendUrl = typeof process !== 'undefined' ? process.env?.FRONTEND_URL : undefined;
    response.headers.set('Access-Control-Allow-Origin', frontendUrl || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

function getRequiredRole(pathname: string): Role | null {
  // Check exact matches first
  if (PROTECTED_ROUTES[pathname]) {
    return PROTECTED_ROUTES[pathname];
  }
  
  // Check for longest matching prefix
  let longestMatch = '';
  let requiredRole: Role | null = null;
  
  for (const [route, role] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route) && route.length > longestMatch.length) {
      longestMatch = route;
      requiredRole = role;
    }
  }
  
  return requiredRole;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  if (reason) {
    loginUrl.searchParams.set('reason', reason);
  }
  return NextResponse.redirect(loginUrl);
}

// Handle preflight OPTIONS requests for CORS
export function handleOptions(request: NextRequest): NextResponse {
  const frontendUrl = typeof process !== 'undefined' ? process.env?.FRONTEND_URL : undefined;
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': frontendUrl || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export const config = {
  matcher: [
    // Match all admin routes
    '/admin/:path*',
    // Match API routes for rate limiting and CORS
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};