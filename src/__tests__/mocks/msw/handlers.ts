import { http, HttpResponse } from 'msw'
import { createMockCompany, createMockUser, createMockTreasuryData } from '../factories'

export const handlers = [
  // Company endpoints
  http.get('/api/data/companies', () => {
    return HttpResponse.json({
      success: true,
      data: [
        createMockCompany({ ticker: 'MSTR', name: 'MicroStrategy' }),
        createMockCompany({ ticker: 'TSLA', name: 'Tesla' }),
        createMockCompany({ ticker: 'AAPL', name: 'Apple' }),
      ],
    })
  }),

  http.get('/api/data/companies/:ticker', ({ params }) => {
    const { ticker } = params
    return HttpResponse.json({
      success: true,
      data: createMockCompany({ ticker: ticker as string }),
    })
  }),

  http.post('/api/admin/companies', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      company: createMockCompany({
        ...body,
        id: 'new-company-id',
      }),
    }, { status: 201 })
  }),

  http.put('/api/admin/companies/:ticker', async ({ params, request }) => {
    const { ticker } = params
    const body = await request.json()
    return HttpResponse.json({
      company: createMockCompany({
        ...body,
        ticker: ticker as string,
      }),
    })
  }),

  http.delete('/api/admin/companies/:ticker', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Company ${params.ticker} deleted successfully`,
    })
  }),

  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    const { email, password } = body as any

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        token: 'mock-jwt-token',
        user: createMockUser({ email }),
      })
    }

    return HttpResponse.json({
      error: 'Invalid credentials',
    }, { status: 401 })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      user: createMockUser(body as any),
    }, { status: 201 })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  http.get('/api/auth/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        error: 'Unauthorized',
      }, { status: 401 })
    }

    return HttpResponse.json({
      success: true,
      user: createMockUser(),
    })
  }),

  // Analytics endpoints
  http.get('/api/analytics/summary', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalCompanies: 10,
        totalTreasuryValue: 5000000000,
        averagePremiumToNav: 1.25,
        topPerformers: [
          { ticker: 'MSTR', performance: 0.35 },
          { ticker: 'TSLA', performance: 0.28 },
        ],
      },
    })
  }),

  http.get('/api/analytics/comprehensive/:ticker', ({ params }) => {
    const { ticker } = params
    return HttpResponse.json({
      success: true,
      data: {
        ticker,
        treasury: [createMockTreasuryData({ companyId: ticker as string })],
        metrics: {
          treasuryValue: 1000000000,
          navPerShare: 100,
          premiumToNav: 1.2,
          dilutionRisk: 0.15,
        },
        performance: {
          daily: 0.02,
          weekly: 0.05,
          monthly: 0.12,
          yearly: 0.45,
        },
      },
    })
  }),

  // Market data endpoints
  http.get('/api/data/market', () => {
    return HttpResponse.json({
      success: true,
      data: {
        btc: { price: 50000, change24h: 0.03 },
        eth: { price: 3000, change24h: 0.05 },
        stocks: {
          SPY: { price: 450, change: 0.01 },
          QQQ: { price: 380, change: 0.02 },
        },
      },
    })
  }),

  // Health check
  http.get('/api/monitoring/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      uptime: 86400,
      version: '1.0.0',
    })
  }),

  // WebSocket mock (for real-time data)
  http.get('/api/data/websocket', () => {
    return HttpResponse.json({
      url: 'ws://localhost:3001',
      protocol: 'v1',
    })
  }),
]

// Error handlers for testing error scenarios
export const errorHandlers = [
  http.get('/api/data/companies', () => {
    return HttpResponse.json({
      error: 'Database connection failed',
    }, { status: 500 })
  }),

  http.post('/api/admin/companies', () => {
    return HttpResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }),
]