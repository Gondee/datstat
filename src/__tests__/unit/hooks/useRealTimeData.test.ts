import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealTimeData } from '@/hooks/useRealTimeData'
import { MockWebSocket, mockWebSocket } from '@/__tests__/mocks/react-helpers'

describe('useRealTimeData', () => {
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWebSocket()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (mockWs && mockWs.readyState === WebSocket.OPEN) {
      mockWs.close()
    }
  })

  it('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Get the created WebSocket instance
    mockWs = global.WebSocket.mock.results[0].value
    expect(mockWs.url).toContain('ws://')
  })

  it('should handle incoming price updates', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    // Simulate incoming message
    act(() => {
      mockWs.simulateMessage({
        type: 'price_update',
        ticker: 'TEST',
        data: {
          price: 150.50,
          change: 2.50,
          changePercent: 0.0169,
        },
      })
    })

    expect(result.current.data).toEqual({
      price: 150.50,
      change: 2.50,
      changePercent: 0.0169,
    })
  })

  it('should handle treasury updates', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    act(() => {
      mockWs.simulateMessage({
        type: 'treasury_update',
        ticker: 'TEST',
        data: {
          totalValue: 1000000000,
          btcHoldings: 10000,
          ethHoldings: 5000,
        },
      })
    })

    expect(result.current.treasuryData).toEqual({
      totalValue: 1000000000,
      btcHoldings: 10000,
      ethHoldings: 5000,
    })
  })

  it('should reconnect on disconnect', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    // Simulate disconnect
    act(() => {
      mockWs.close()
    })

    expect(result.current.isConnected).toBe(false)

    // Should attempt to reconnect
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(2)
    }, { timeout: 3000 })
  })

  it('should clean up on unmount', async () => {
    const { result, unmount } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value
    const closeSpy = vi.spyOn(mockWs, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('should handle connection errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    // Simulate error
    act(() => {
      mockWs.onerror?.(new Event('error'))
    })

    expect(result.current.error).toBeTruthy()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should subscribe to multiple data types', async () => {
    const { result } = renderHook(() => 
      useRealTimeData('TEST', { 
        subscribeToTypes: ['price', 'treasury', 'news'] 
      })
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value
    const sendSpy = vi.spyOn(mockWs, 'send')

    // Check that subscription messages were sent
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        ticker: 'TEST',
        dataTypes: ['price', 'treasury', 'news'],
      })
    )
  })

  it('should handle rate limiting', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    // Simulate rate limit message
    act(() => {
      mockWs.simulateMessage({
        type: 'error',
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      })
    })

    expect(result.current.error).toBe('Rate limited: Too many requests')
  })

  it('should batch updates for performance', async () => {
    const { result } = renderHook(() => useRealTimeData('TEST'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    mockWs = global.WebSocket.mock.results[0].value

    // Send multiple rapid updates
    act(() => {
      for (let i = 0; i < 10; i++) {
        mockWs.simulateMessage({
          type: 'price_update',
          ticker: 'TEST',
          data: {
            price: 150 + i,
            change: i,
            changePercent: i * 0.01,
          },
        })
      }
    })

    // Should only have the last update
    expect(result.current.data?.price).toBe(159)
  })
})