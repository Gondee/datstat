// Main API exports
export * from './types';
export * from './middleware/auth';
export * from './middleware/rateLimit';
export * from './middleware/validation';
export * from './middleware/logging';
export * from './utils/response';
export * from './gateway/router';

// V1 API routes
export * from './v1/companies';
export * from './v1/treasury';
export * from './v1/market';
export * from './v1/analytics';
export * from './v1/routes';

// GraphQL
export * from './graphql/schema';
export * from './graphql/resolvers';

// Webhooks
export * from './webhooks/handler';

// Integrations
export * from './integrations/slack';
export * from './integrations/export';

// Documentation
export * from './docs/generator';
export * from './docs/route';

// API Configuration
export const API_CONFIG = {
  version: 'v1',
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  rateLimits: {
    free: { windowMs: 60000, max: 60 },
    basic: { windowMs: 60000, max: 300 },
    pro: { windowMs: 60000, max: 1000 },
    enterprise: { windowMs: 60000, max: 5000 },
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  cache: {
    ttl: 300, // 5 minutes
    checkPeriod: 60, // 1 minute
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    apiKeyLength: 32,
    bcryptRounds: 10,
  },
};

// API initialization
export async function initializeAPI() {
  console.log('Initializing Treasury Analytics API...');
  
  // Load webhooks
  const { webhookEmitter } = await import('./webhooks/handler');
  await webhookEmitter.loadWebhooks();
  
  // Initialize monitoring
  const { apiLogger } = await import('./middleware/logging');
  
  // Log startup
  console.log(`API v${API_CONFIG.version} initialized successfully`);
  console.log(`Base URL: ${API_CONFIG.baseUrl}`);
  console.log(`Rate limiting enabled with tiers: ${Object.keys(API_CONFIG.rateLimits).join(', ')}`);
  
  return {
    version: API_CONFIG.version,
    status: 'ready',
    timestamp: new Date().toISOString(),
  };
}

// API health check
export async function checkAPIHealth() {
  const checks = {
    api: true,
    database: false,
    cache: false,
    external: false,
  };

  try {
    // Check database
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check cache (if implemented)
  checks.cache = true; // Placeholder

  // Check external services
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/ping');
    checks.external = response.ok;
  } catch (error) {
    console.error('External service health check failed:', error);
  }

  const allHealthy = Object.values(checks).every(v => v);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}

// Export utility functions
export { generateOpenAPISpec } from './docs/generator';
export { ApiResponseBuilder } from './utils/response';
export { webhookEmitter } from './webhooks/handler';