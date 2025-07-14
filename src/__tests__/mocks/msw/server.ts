import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup MSW server with default handlers
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test (important for test isolation)
afterEach(() => server.resetHandlers())

// Clean up after all tests are done
afterAll(() => server.close())