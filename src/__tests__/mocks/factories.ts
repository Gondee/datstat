import { Company, User, TreasuryData, ExecutiveCompensation, MarketData } from '@prisma/client'

// Factory for creating test companies
export const createMockCompany = (overrides?: Partial<Company>): Company => ({
  id: 'test-company-id',
  ticker: 'TEST',
  name: 'Test Company',
  sector: 'Technology',
  industry: 'Software',
  description: 'A test company for unit tests',
  marketCap: 1000000000,
  employees: 1000,
  founded: 1990,
  headquarters: 'San Francisco, CA',
  website: 'https://test.com',
  cik: '0001234567',
  exchange: 'NASDAQ',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Factory for creating test users
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  password: '$2a$10$hashedpassword',
  name: 'Test User',
  role: 'user',
  isActive: true,
  lastLogin: new Date('2025-01-01'),
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Factory for creating test treasury data
export const createMockTreasuryData = (overrides?: Partial<TreasuryData>): TreasuryData => ({
  id: 'test-treasury-id',
  companyId: 'test-company-id',
  quarter: 'Q4',
  year: 2024,
  filingDate: new Date('2025-01-01'),
  totalCash: 50000000,
  shortTermInvestments: 30000000,
  longTermInvestments: 20000000,
  totalInvestments: 50000000,
  cashAndCashEquivalents: 80000000,
  totalLiquidity: 100000000,
  
  // Treasury Securities
  treasurySecurities: 15000000,
  treasuryBills: 5000000,
  treasuryNotes: 7000000,
  treasuryBonds: 3000000,
  
  // Corporate Securities
  corporateBonds: 10000000,
  commercialPaper: 5000000,
  
  // Other Investments
  moneyMarketFunds: 8000000,
  mutualFunds: 2000000,
  equitySecurities: 5000000,
  
  // Crypto Assets
  bitcoin: 1000000,
  ethereum: 500000,
  otherCrypto: 200000,
  totalCrypto: 1700000,
  
  // Additional Metrics
  cashAsPercentOfAssets: 0.25,
  investmentYield: 0.035,
  btcPrice: 50000,
  ethPrice: 3000,
  
  // Metadata
  sourceDocument: '10-K',
  sourceUrl: 'https://sec.gov/test',
  notes: null,
  isEstimate: false,
  confidence: 0.95,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Factory for creating test executive compensation
export const createMockExecutiveCompensation = (overrides?: Partial<ExecutiveCompensation>): ExecutiveCompensation => ({
  id: 'test-exec-comp-id',
  companyId: 'test-company-id',
  executiveName: 'John Doe',
  position: 'CEO',
  year: 2024,
  baseSalary: 1000000,
  bonus: 500000,
  stockAwards: 2000000,
  optionAwards: 1000000,
  otherCompensation: 250000,
  totalCompensation: 4750000,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Factory for creating test market data
export const createMockMarketData = (overrides?: Partial<MarketData>): MarketData => ({
  id: 'test-market-data-id',
  symbol: 'TEST',
  price: 100.50,
  change: 2.50,
  changePercent: 0.025,
  volume: 1000000,
  marketCap: 1000000000,
  dayHigh: 102.00,
  dayLow: 98.00,
  weekHigh52: 120.00,
  weekLow52: 80.00,
  pe: 25.5,
  eps: 3.94,
  beta: 1.2,
  dividend: 0.50,
  dividendYield: 0.02,
  timestamp: new Date('2025-01-01'),
  source: 'mock',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

// Helper function to create multiple mock items
export const createMockArray = <T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overrides?: (index: number) => Partial<T>
): T[] => {
  return Array.from({ length: count }, (_, index) =>
    factory(overrides ? overrides(index) : undefined)
  )
}