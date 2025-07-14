import { performanceMonitoring } from './monitoring';
import { logger } from '@/services/external/utils/logger';
import { prisma } from '@/lib/prisma';

// Initialize performance monitoring on application startup
export async function initializePerformanceMonitoring() {
  try {
    logger.info('Performance', 'Initializing performance monitoring...');
    
    // Enable Prisma metrics
    // TODO: Fix Prisma metrics API
    // await prisma.$metrics.json();
    
    // Start system monitoring
    const stopMonitoring = await performanceMonitoring();
    
    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Performance', 'Shutting down performance monitoring...');
      stopMonitoring();
      await prisma.$disconnect();
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(0);
      }
    };
    
    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }
    
    logger.info('Performance', 'Performance monitoring initialized successfully');
  } catch (error) {
    logger.error('Performance', 'Failed to initialize performance monitoring', error as Error);
  }
}

// Performance optimization middleware for Next.js
export function performanceMiddleware(request: Request) {
  const startTime = Date.now();
  
  // Add performance headers
  const headers = new Headers({
    'X-Request-Start': startTime.toString(),
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  return headers;
}

// Auto-cleanup for stale data
export async function performDataCleanup() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean up old market data
    const deletedMarketData = await prisma.marketData.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });
    
    logger.info('Performance', `Cleaned up ${deletedMarketData.count} old market data entries`);
    
    // Vacuum database (PostgreSQL specific)
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    
    logger.info('Performance', 'Database maintenance completed');
  } catch (error) {
    logger.error('Performance', 'Data cleanup failed', error as Error);
  }
}

// Schedule periodic cleanup
export function schedulePeriodicMaintenance() {
  // Run cleanup daily at 3 AM
  const now = new Date();
  const threePM = new Date(now);
  threePM.setHours(3, 0, 0, 0);
  
  if (threePM <= now) {
    threePM.setDate(threePM.getDate() + 1);
  }
  
  const msUntilThreePM = threePM.getTime() - now.getTime();
  
  setTimeout(() => {
    performDataCleanup();
    
    // Schedule next cleanup
    setInterval(performDataCleanup, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntilThreePM);
}