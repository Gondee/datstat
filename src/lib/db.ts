// Re-export database utilities for analytics engines
export { prisma } from './prisma';
export * from './database-utils';

// Import for internal use
import { prisma } from './prisma';

// Export a function to get the Prisma client instance
export function getPrismaClient() {
  return prisma;
}