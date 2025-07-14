import { NextRequest, NextResponse } from 'next/server';

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  body?: any;
  response?: {
    status: number;
    body?: any;
  };
  duration?: number;
  error?: any;
  userId?: string;
  apiKeyId?: string;
  ip?: string;
  userAgent?: string;
}

class ApiLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  log(entry: LogEntry) {
    // Add to in-memory store
    this.logs.push(entry);
    
    // Trim if too many logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API]', {
        timestamp: entry.timestamp,
        method: entry.method,
        path: entry.path,
        duration: entry.duration,
        status: entry.response?.status,
      });
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry);
    }
  }

  private async sendToLoggingService(entry: LogEntry) {
    // Implement integration with logging service (e.g., Datadog, LogRocket, etc.)
    // This is a placeholder for actual implementation
    try {
      // await fetch('https://logging-service.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const apiLogger = new ApiLogger();

export function createLogEntry(req: NextRequest): LogEntry {
  const url = new URL(req.url);
  const query: Record<string, any> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Skip sensitive headers
    if (!['authorization', 'x-api-key', 'cookie'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: url.pathname,
    query,
    headers,
    ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}

export async function logApiRequest(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: {
    userId?: string;
    apiKeyId?: string;
    logBody?: boolean;
  }
): Promise<NextResponse> {
  const startTime = Date.now();
  const entry = createLogEntry(req);

  if (options?.userId) entry.userId = options.userId;
  if (options?.apiKeyId) entry.apiKeyId = options.apiKeyId;

  // Log request body if enabled and not too large
  if (options?.logBody && req.body) {
    try {
      const body = await req.clone().json();
      if (JSON.stringify(body).length < 10000) {
        entry.body = body;
      }
    } catch {
      // Ignore body parsing errors
    }
  }

  try {
    const response = await handler();
    const duration = Date.now() - startTime;

    entry.duration = duration;
    entry.response = {
      status: response.status,
    };

    // Log response body for non-success statuses
    if (response.status >= 400) {
      try {
        const body = await response.clone().json();
        entry.response.body = body;
      } catch {
        // Ignore response parsing errors
      }
    }

    apiLogger.log(entry);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    entry.duration = duration;
    entry.error = error instanceof Error ? error.message : 'Unknown error';
    entry.response = {
      status: 500,
    };

    apiLogger.log(entry);
    throw error;
  }
}

// Audit logging for sensitive operations
export async function auditLog(
  action: string,
  resource: string,
  resourceId?: string,
  changes?: Record<string, any>,
  user?: { id: string; type: 'user' | 'apiKey' }
) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    resource,
    resourceId,
    changes,
    userId: user?.type === 'user' ? user.id : undefined,
    apiKeyId: user?.type === 'apiKey' ? user.id : undefined,
  };

  // Store in database
  try {
    // await prisma.auditLog.create({ data: entry });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}