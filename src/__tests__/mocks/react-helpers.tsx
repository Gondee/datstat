import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Create a custom render function that includes providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialState?: any
}

// Custom provider wrapper
const AllTheProviders = ({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function
export const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }

// Mock hook for testing components that use hooks
export const renderHook = <T,>(
  hook: () => T,
  options?: CustomRenderOptions
) => {
  const { queryClient = createTestQueryClient() } = options || {}
  
  let result: T
  const TestComponent = () => {
    result = hook()
    return null
  }

  customRender(<TestComponent />, { queryClient })
  
  return {
    result: result!,
    rerender: () => customRender(<TestComponent />, { queryClient }),
  }
}

// Helper to wait for async operations
export const waitForAsync = async (ms: number = 100) => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to mock fetch responses
export const mockFetch = (response: any, options?: { status?: number; ok?: boolean }) => {
  const { status = 200, ok = true } = options || {}
  
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers(),
  })
  
  return global.fetch
}

// Helper to mock failed fetch
export const mockFetchError = (error: Error = new Error('Network error')) => {
  global.fetch = vi.fn().mockRejectedValue(error)
  return global.fetch
}

// Helper to test loading states
export const expectLoadingState = (getByTestId: Function) => {
  expect(() => getByTestId('loading')).not.toThrow()
}

// Helper to test error states
export const expectErrorState = (getByText: Function, errorMessage: string) => {
  expect(() => getByText(errorMessage)).not.toThrow()
}

// Mock WebSocket for testing real-time features
export class MockWebSocket {
  url: string
  readyState: number = WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

// Replace global WebSocket with mock
export const mockWebSocket = () => {
  global.WebSocket = MockWebSocket as any
}