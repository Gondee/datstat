import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { vi } from 'vitest'

// Mock NextRequest for API route testing
export const createMockRequest = (
  url: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  }
): NextRequest => {
  const { method = 'GET', headers: customHeaders = {}, body, searchParams = {} } = options || {}
  
  const requestUrl = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value)
  })

  const request = new NextRequest(requestUrl, {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...customHeaders,
    }),
    body: body ? JSON.stringify(body) : undefined,
  })

  return request
}

// Mock response helper
export const createMockResponse = () => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    headers: new Headers(),
  }
  return response
}

// Helper to mock auth headers
export const createAuthHeaders = (token: string = 'mock-jwt-token') => ({
  Authorization: `Bearer ${token}`,
})

// Helper to test API routes
export const testApiRoute = async (
  handler: Function,
  request: NextRequest,
  context?: any
) => {
  try {
    const response = await handler(request, context)
    const data = await response.json()
    return {
      status: response.status,
      data,
      headers: response.headers,
    }
  } catch (error) {
    return {
      error,
      status: 500,
    }
  }
}

// Mock Next.js headers function
export const mockHeaders = (customHeaders: Record<string, string> = {}) => {
  vi.mock('next/headers', () => ({
    headers: vi.fn(() => ({
      get: (key: string) => customHeaders[key] || null,
      has: (key: string) => key in customHeaders,
      forEach: (callback: Function) => {
        Object.entries(customHeaders).forEach(([key, value]) => {
          callback(value, key)
        })
      },
    })),
  }))
}

// Helper to create mock context for API routes
export const createMockContext = (params: Record<string, string> = {}) => ({
  params,
})

// Helper for testing protected routes
export const testProtectedRoute = async (
  handler: Function,
  request: NextRequest,
  context?: any
) => {
  // Test without auth header
  const unauthorizedResponse = await testApiRoute(handler, request, context)
  expect(unauthorizedResponse.status).toBe(401)
  
  // Test with auth header
  const authorizedRequest = createMockRequest(request.url, {
    method: request.method,
    headers: createAuthHeaders(),
    body: await request.json().catch(() => null),
  })
  
  return testApiRoute(handler, authorizedRequest, context)
}

// Helper for testing rate-limited routes
export const testRateLimitedRoute = async (
  handler: Function,
  url: string,
  limit: number = 10
) => {
  const requests = Array.from({ length: limit + 1 }, () =>
    testApiRoute(handler, createMockRequest(url))
  )
  
  const responses = await Promise.all(requests)
  const lastResponse = responses[responses.length - 1]
  
  return {
    responses,
    wasRateLimited: lastResponse.status === 429,
  }
}