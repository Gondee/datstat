# Testing Infrastructure

This directory contains the comprehensive testing setup for the DAT (Digital Asset Treasury) application.

## Test Structure

```
src/__tests__/
├── unit/               # Unit tests for individual components and functions
├── integration/        # Integration tests for API routes and data flow
├── mocks/              # Mock utilities and test helpers
│   ├── factories.ts    # Factory functions for creating test data
│   ├── prisma.ts       # Prisma client mocking
│   ├── api-helpers.ts  # API route testing utilities
│   ├── react-helpers.tsx # React component testing utilities
│   └── msw/            # Mock Service Worker setup
│       ├── handlers.ts # API mock handlers
│       └── server.ts   # MSW server configuration
└── README.md           # This file

e2e/                    # End-to-end tests using Playwright
└── admin-flow.spec.ts  # E2E tests for admin functionality
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration
```

### E2E Tests
```bash
# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run E2E tests with UI (headed mode)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

### All Tests
```bash
# Run all test suites
npm run test:all
```

## Test Utilities

### Factory Functions
Use factory functions to create consistent test data:

```typescript
import { createMockCompany, createMockUser, createMockTreasuryData } from '@/__tests__/mocks/factories'

const company = createMockCompany({
  ticker: 'TEST',
  name: 'Test Company'
})
```

### Prisma Mocking
The Prisma client is automatically mocked in all tests:

```typescript
import { prismaMock } from '@/__tests__/mocks/prisma'

// In your test
prismaMock.company.findMany.mockResolvedValue([mockCompany])
```

### API Route Testing
Use the API helpers for testing Next.js API routes:

```typescript
import { createMockRequest, testApiRoute } from '@/__tests__/mocks/api-helpers'
import { GET } from '@/app/api/companies/route'

const request = createMockRequest('http://localhost:3000/api/companies', {
  method: 'GET',
  headers: { Authorization: 'Bearer token' }
})

const response = await testApiRoute(GET, request)
```

### React Component Testing
Use the custom render function that includes providers:

```typescript
import { render, screen } from '@/__tests__/mocks/react-helpers'
import MyComponent from '@/components/MyComponent'

render(<MyComponent />)
expect(screen.getByText('Hello')).toBeInTheDocument()
```

### Mock Service Worker (MSW)
MSW is configured to intercept API calls in tests:

```typescript
import { server } from '@/__tests__/mocks/msw/server'
import { http, HttpResponse } from 'msw'

// Override a handler for a specific test
server.use(
  http.get('/api/companies', () => {
    return HttpResponse.json({ error: 'Server error' }, { status: 500 })
  })
)
```

## Writing Tests

### Component Test Example
```typescript
describe('CompanyCard', () => {
  it('should display company information', () => {
    const company = createMockCompany({ ticker: 'MSTR' })
    
    render(<CompanyCard company={company} />)
    
    expect(screen.getByText('MSTR')).toBeInTheDocument()
    expect(screen.getByText(company.name)).toBeInTheDocument()
  })
})
```

### API Route Test Example
```typescript
describe('POST /api/companies', () => {
  it('should create a new company', async () => {
    prismaMock.company.create.mockResolvedValue(mockCompany)
    
    const request = createMockRequest('/api/companies', {
      method: 'POST',
      body: { ticker: 'TEST', name: 'Test Co' }
    })
    
    const response = await testApiRoute(POST, request)
    
    expect(response.status).toBe(201)
    expect(response.data.company.ticker).toBe('TEST')
  })
})
```

### Store Test Example
```typescript
describe('DATStore', () => {
  it('should filter companies by search query', () => {
    const { result } = renderHook(() => useDATStore())
    
    act(() => {
      result.current.setCompanies([company1, company2])
      result.current.updateFilters({ searchQuery: 'micro' })
    })
    
    expect(result.current.filteredCompanies).toHaveLength(1)
  })
})
```

## Coverage Reports

After running tests with coverage, view the HTML report:
```bash
npm run test:coverage
open coverage/index.html
```

Coverage thresholds are configured in `vitest.config.ts`:
- Branches: 70%
- Functions: 70%
- Lines: 80%
- Statements: 80%

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Mock External Dependencies**: Always mock API calls, database operations, and external services
3. **Use Factories**: Create test data using factory functions for consistency
4. **Test User Interactions**: Focus on testing from the user's perspective
5. **Async Testing**: Use `waitFor` for async operations and state updates
6. **Error Cases**: Always test error scenarios and edge cases
7. **Accessibility**: Include tests for keyboard navigation and screen readers

## Debugging Tests

### Vitest UI
```bash
npm run test:ui
```
Opens an interactive UI for exploring and debugging tests.

### Console Logging
The test setup suppresses some console warnings. To see all console output:
```typescript
// Temporarily in your test
console.error = console.log
```

### Playwright Inspector
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging of E2E tests.

## Continuous Integration

The test suite is designed to run in CI environments. Make sure to:
1. Set up test database for integration tests
2. Configure environment variables
3. Run tests in parallel where possible
4. Archive test reports and coverage data