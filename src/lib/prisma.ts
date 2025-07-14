import { PrismaClient } from '@prisma/client';

// Global variable to hold the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with connection pooling and logging configuration
// During build phase, we might not have a DATABASE_URL yet
const createPrismaClient = () => {
  // If we're in build phase and no DATABASE_URL, return a dummy URL
  // This allows the build to complete, but the app won't work without a real DB
  const databaseUrl = (typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined) || 
    (typeof process !== 'undefined' && process.env?.VERCEL && !process.env?.DATABASE_URL ? 
      'postgresql://user:password@localhost:5432/mydb?schema=public' : 
      undefined);

  if (!databaseUrl && typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    console.warn('DATABASE_URL not set in production environment');
  }

  return new PrismaClient({
    log: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development (hot reload issue)
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler - only in Node.js runtime
if (typeof process !== 'undefined' && process.on) {
  async function gracefulShutdown() {
    console.log('Closing database connections...');
    await prisma.$disconnect();
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(0);
    }
  }

  // Handle shutdown signals
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Transaction wrapper with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// Safe transaction wrapper
export async function safeTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return withRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  });
}

export default prisma;