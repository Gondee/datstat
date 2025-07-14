import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { vi } from 'vitest'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>

// Mock the prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

// Reset mock before each test
beforeEach(() => {
  mockReset(prismaMock)
})

// Export type for use in tests
export type MockPrismaClient = typeof prismaMock