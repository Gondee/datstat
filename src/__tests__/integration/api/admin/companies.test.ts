import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/admin/companies/route'
import { prismaMock } from '@/__tests__/mocks/prisma'
import { createMockRequest, testApiRoute } from '@/__tests__/mocks/api-helpers'
import { createMockCompany, createMockArray } from '@/__tests__/mocks/factories'

describe('/api/admin/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/companies', () => {
    it('should return all companies sorted by ticker', async () => {
      const mockCompanies = createMockArray(createMockCompany, 3, (index) => ({
        ticker: `TEST${index}`,
        name: `Test Company ${index}`,
      }))

      prismaMock.company.findMany.mockResolvedValue(mockCompanies as any)

      const response = await testApiRoute(GET)

      expect(response.status).toBe(200)
      expect(response.data).toEqual({ companies: mockCompanies })
      expect(prismaMock.company.findMany).toHaveBeenCalledWith({
        include: {
          treasuryHoldings: {
            include: {
              transactions: true
            }
          },
          executiveCompensation: true,
          capitalStructure: {
            include: {
              convertibleDebt: true,
              warrants: true
            }
          }
        },
        orderBy: {
          ticker: 'asc'
        }
      })
    })

    it('should handle database errors', async () => {
      prismaMock.company.findMany.mockRejectedValue(new Error('Database connection failed'))

      const response = await testApiRoute(GET)

      expect(response.status).toBe(500)
      expect(response.data).toEqual({ error: 'Failed to fetch companies' })
    })

    it('should return empty array when no companies exist', async () => {
      prismaMock.company.findMany.mockResolvedValue([])

      const response = await testApiRoute(GET)

      expect(response.status).toBe(200)
      expect(response.data).toEqual({ companies: [] })
    })
  })

  describe('POST /api/admin/companies', () => {
    const validCompanyData = {
      ticker: 'TEST',
      name: 'Test Company',
      description: 'A test company for unit tests',
      sector: 'Technology',
      marketCap: 1000000000,
      sharesOutstanding: 100000000,
      shareholdersEquity: 500000000,
      totalDebt: 200000000,
      businessModel: {
        revenueStreams: ['Software', 'Services'],
        operatingRevenue: 500000000,
        operatingExpenses: 400000000,
        cashBurnRate: 10000000,
        isTreasuryFocused: false,
        legacyBusinessValue: 800000000,
      },
      capitalStructure: {
        sharesBasic: 100000000,
        sharesDilutedCurrent: 110000000,
        sharesDilutedAssumed: 120000000,
        sharesFloat: 80000000,
        sharesInsiderOwned: 20000000,
        sharesInstitutionalOwned: 50000000,
        weightedAverageShares: 105000000,
        stockOptions: 5000000,
        restrictedStockUnits: 3000000,
        performanceStockUnits: 2000000,
        convertibleDebt: [],
        warrants: [],
      },
      governance: {
        boardSize: 9,
        independentDirectors: 7,
        ceoFounder: false,
        votingRights: '1 vote per share',
        auditFirm: 'PwC',
      },
    }

    it('should create a new company with valid data', async () => {
      const mockCreatedCompany = createMockCompany({
        ...validCompanyData,
        id: 'new-company-id',
      })

      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockResolvedValue(mockCreatedCompany as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: validCompanyData,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(201)
      expect(response.data).toEqual({ company: mockCreatedCompany })
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticker: 'TEST',
            name: 'Test Company',
            description: 'A test company for unit tests',
            sector: 'Technology',
          }),
        })
      )
    })

    it('should reject request with missing required fields', async () => {
      const invalidData = {
        ticker: 'TEST',
        // missing name, description, sector
      }

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: invalidData,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(400)
      expect(response.data).toEqual({ error: 'Missing required fields' })
      expect(prismaMock.company.create).not.toHaveBeenCalled()
    })

    it('should reject duplicate ticker symbols', async () => {
      const existingCompany = createMockCompany({ ticker: 'TEST' })
      prismaMock.company.findUnique.mockResolvedValue(existingCompany as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: validCompanyData,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(409)
      expect(response.data).toEqual({ error: 'Company with this ticker already exists' })
      expect(prismaMock.company.create).not.toHaveBeenCalled()
    })

    it('should convert ticker to uppercase', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockResolvedValue(createMockCompany() as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: {
          ...validCompanyData,
          ticker: 'test', // lowercase
        },
      })

      await testApiRoute(POST, request)

      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticker: 'TEST', // should be uppercase
          }),
        })
      )
    })

    it('should handle convertible debt creation', async () => {
      const dataWithDebt = {
        ...validCompanyData,
        capitalStructure: {
          ...validCompanyData.capitalStructure,
          convertibleDebt: [
            {
              issueDate: '2025-01-01',
              maturityDate: '2030-01-01',
              principal: 100000000,
              interestRate: 0.025,
              conversionPrice: 50,
              conversionRatio: 20,
              currentValue: 95000000,
              isOutstanding: true,
              notes: 'Convertible note',
            },
          ],
        },
      }

      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockResolvedValue(createMockCompany() as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: dataWithDebt,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(201)
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            capitalStructure: expect.objectContaining({
              create: expect.objectContaining({
                convertibleDebt: expect.objectContaining({
                  create: expect.arrayContaining([
                    expect.objectContaining({
                      principal: 100000000,
                      interestRate: 0.025,
                    }),
                  ]),
                }),
              }),
            }),
          }),
        })
      )
    })

    it('should handle warrants creation', async () => {
      const dataWithWarrants = {
        ...validCompanyData,
        capitalStructure: {
          ...validCompanyData.capitalStructure,
          warrants: [
            {
              issueDate: '2025-01-01',
              expirationDate: '2028-01-01',
              strikePrice: 100,
              sharesPerWarrant: 1,
              totalWarrants: 1000000,
              isOutstanding: true,
              notes: 'Employee warrants',
            },
          ],
        },
      }

      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockResolvedValue(createMockCompany() as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: dataWithWarrants,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(201)
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            capitalStructure: expect.objectContaining({
              create: expect.objectContaining({
                warrants: expect.objectContaining({
                  create: expect.arrayContaining([
                    expect.objectContaining({
                      strikePrice: 100,
                      totalWarrants: 1000000,
                    }),
                  ]),
                }),
              }),
            }),
          }),
        })
      )
    })

    it('should handle database errors during creation', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: validCompanyData,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(500)
      expect(response.data).toEqual({ error: 'Failed to create company' })
    })

    it('should handle missing optional fields with defaults', async () => {
      const minimalData = {
        ticker: 'MIN',
        name: 'Minimal Company',
        description: 'A minimal test company',
        sector: 'Technology',
        capitalStructure: {
          sharesBasic: 1000000,
          sharesDilutedCurrent: 1000000,
          sharesDilutedAssumed: 1000000,
          sharesFloat: 800000,
          sharesInsiderOwned: 200000,
          sharesInstitutionalOwned: 500000,
          weightedAverageShares: 1000000,
          stockOptions: 0,
          restrictedStockUnits: 0,
          performanceStockUnits: 0,
        },
      }

      prismaMock.company.findUnique.mockResolvedValue(null)
      prismaMock.company.create.mockResolvedValue(createMockCompany() as any)

      const request = createMockRequest('http://localhost:3000/api/admin/companies', {
        method: 'POST',
        body: minimalData,
      })

      const response = await testApiRoute(POST, request)

      expect(response.status).toBe(201)
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revenueStreams: [],
            operatingRevenue: 0,
            operatingExpenses: 0,
            cashBurnRate: 0,
            isTreasuryFocused: false,
            legacyBusinessValue: 0,
            boardSize: 0,
            independentDirectors: 0,
            ceoFounder: false,
          }),
        })
      )
    })
  })
})