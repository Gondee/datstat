import { 
  Company, 
  MarketData, 
  CryptoPrice, 
  CalculatedMetrics, 
  CompanyWithMetrics, 
  NewsItem,
  HistoricalDataPoint
} from '@/types';
import InstitutionalMetricsEngine from '@/utils/institutionalMetrics';

// Current crypto prices (mock)
export const cryptoPrices: Record<string, CryptoPrice> = {
  BTC: {
    symbol: 'BTC',
    price: 67830,
    change24h: 1250,
    change24hPercent: 1.88,
    marketCap: 1331000000000,
    volume24h: 28500000000,
    timestamp: new Date().toISOString(),
  },
  ETH: {
    symbol: 'ETH',
    price: 3456,
    change24h: -45,
    change24hPercent: -1.29,
    marketCap: 415000000000,
    volume24h: 12300000000,
    timestamp: new Date().toISOString(),
  },
  SOL: {
    symbol: 'SOL',
    price: 185.50,
    change24h: 8.20,
    change24hPercent: 4.62,
    marketCap: 85000000000,
    volume24h: 3200000000,
    timestamp: new Date().toISOString(),
  },
};

// Mock companies data with comprehensive institutional metrics
export const companies: Company[] = [
  {
    ticker: 'MSTR',
    name: 'MicroStrategy Incorporated',
    description: 'Business intelligence software company and largest corporate holder of Bitcoin',
    sector: 'Technology',
    marketCap: 85000000000,
    sharesOutstanding: 21700000,
    shareholdersEquity: 2500000000,
    totalDebt: 4200000000,
    treasury: [
      {
        crypto: 'BTC',
        amount: 189150,
        averageCostBasis: 31168,
        totalCost: 5894419200,
        currentValue: 12831184500,
        unrealizedGain: 6936765300,
        unrealizedGainPercent: 117.68,
        transactions: [
          {
            id: '1',
            date: '2020-08-11',
            amount: 21454,
            pricePerUnit: 11653,
            totalCost: 250000000,
            type: 'purchase',
            fundingMethod: 'convertible_debt',
            notes: 'Initial Bitcoin purchase',
          },
          {
            id: '2',
            date: '2024-06-20',
            amount: 11931,
            pricePerUnit: 65883,
            totalCost: 786000000,
            type: 'purchase',
            fundingMethod: 'convertible_debt',
            notes: 'Latest purchase via convertible notes',
          },
        ],
      },
    ],
    lastUpdated: new Date().toISOString(),
    
    // Enhanced institutional data
    capitalStructure: {
      sharesBasic: 21700000,
      sharesDilutedCurrent: 24500000,
      sharesDilutedAssumed: 28800000,
      sharesFloat: 19200000,
      sharesInsiderOwned: 2500000,
      sharesInstitutionalOwned: 16800000,
      weightedAverageShares: 23200000,
      convertibleDebt: [
        {
          id: 'conv-1',
          issueDate: '2020-12-08',
          maturityDate: '2025-12-15',
          principal: 650000000,
          interestRate: 0.75,
          conversionPrice: 397.99,
          conversionRatio: 2.5126,
          currentValue: 680000000,
          isOutstanding: true,
          notes: '0.75% Convertible Senior Notes due 2025'
        },
        {
          id: 'conv-2',
          issueDate: '2021-02-19',
          maturityDate: '2027-02-15',
          principal: 1050000000,
          interestRate: 0.0,
          conversionPrice: 1432.46,
          conversionRatio: 0.6983,
          currentValue: 1100000000,
          isOutstanding: true,
          notes: '0% Convertible Senior Notes due 2027'
        }
      ],
      warrants: [
        {
          id: 'warrant-1',
          issueDate: '2021-06-15',
          expirationDate: '2026-06-15',
          strikePrice: 1000.00,
          sharesPerWarrant: 1,
          totalWarrants: 500000,
          isOutstanding: true,
          notes: 'Employee warrant program'
        }
      ],
      stockOptions: 1200000,
      restrictedStockUnits: 800000,
      performanceStockUnits: 400000
    },
    
    executiveCompensation: [
      {
        name: 'Michael J. Saylor',
        title: 'Executive Chairman',
        cashCompensation: 1000000,
        equityCompensation: 0,
        cryptoCompensation: 0,
        totalCompensation: 1000000,
        sharesOwned: 1750000,
        optionsOutstanding: 0,
        year: 2024
      },
      {
        name: 'Phong Le',
        title: 'President & CEO',
        cashCompensation: 900000,
        equityCompensation: 2500000,
        totalCompensation: 3400000,
        sharesOwned: 125000,
        optionsOutstanding: 200000,
        year: 2024
      }
    ],
    
    businessModel: {
      revenueStreams: ['Software licenses', 'Subscription services', 'Professional services'],
      operatingRevenue: 508000000,
      operatingExpenses: 625000000,
      cashBurnRate: -117000000,
      isTreasuryFocused: true,
      legacyBusinessValue: 1200000000
    },
    
    governance: {
      boardSize: 7,
      independentDirectors: 4,
      ceoFounder: false,
      votingRights: 'One vote per share',
      auditFirm: 'KPMG LLP'
    }
  },
  
  {
    ticker: 'DFDV',
    name: 'DeFi Development Corp',
    description: 'Digital asset investment firm focused on DeFi protocols and Solana ecosystem',
    sector: 'Financial Services',
    marketCap: 450000000,
    sharesOutstanding: 150000000,
    shareholdersEquity: 85000000,
    totalDebt: 12000000,
    treasury: [
      {
        crypto: 'SOL',
        amount: 640585,
        averageCostBasis: 136.81,
        totalCost: 87680000,
        currentValue: 118828525,
        unrealizedGain: 31148525,
        unrealizedGainPercent: 35.5,
        transactions: [
          {
            id: '3',
            date: '2024-01-15',
            amount: 172670,
            pricePerUnit: 136.81,
            totalCost: 23625000,
            type: 'purchase',
            fundingMethod: 'equity',
            notes: 'Strategic Solana acquisition - largest purchase to date',
          },
          {
            id: '4',
            date: '2024-03-20',
            amount: 17760,
            pricePerUnit: 153.10,
            totalCost: 2720000,
            type: 'purchase',
            fundingMethod: 'at_the_market',
            notes: 'Continued accumulation strategy',
          },
        ],
        stakingYield: 6.8,
        stakedAmount: 500000,
      },
    ],
    lastUpdated: new Date().toISOString(),
    
    capitalStructure: {
      sharesBasic: 150000000,
      sharesDilutedCurrent: 165000000,
      sharesDilutedAssumed: 175000000,
      sharesFloat: 130000000,
      sharesInsiderOwned: 20000000,
      sharesInstitutionalOwned: 85000000,
      weightedAverageShares: 157000000,
      convertibleDebt: [
        {
          id: 'dfdv-conv-1',
          issueDate: '2024-05-15',
          maturityDate: '2029-05-15',
          principal: 100000000,
          interestRate: 2.25,
          conversionPrice: 5.50,
          conversionRatio: 18.18,
          currentValue: 105000000,
          isOutstanding: true,
          notes: '2.25% Convertible Notes for SOL purchases'
        }
      ],
      warrants: [],
      stockOptions: 8000000,
      restrictedStockUnits: 5000000,
      performanceStockUnits: 2000000
    },
    
    executiveCompensation: [
      {
        name: 'Russell Starr',
        title: 'CEO',
        cashCompensation: 450000,
        equityCompensation: 850000,
        cryptoCompensation: 200000,
        totalCompensation: 1500000,
        sharesOwned: 8500000,
        optionsOutstanding: 1200000,
        year: 2024
      }
    ],
    
    businessModel: {
      revenueStreams: ['DeFi protocol investments', 'Staking rewards', 'Trading fees'],
      operatingRevenue: 12000000,
      operatingExpenses: 18000000,
      cashBurnRate: -6000000,
      isTreasuryFocused: true,
      legacyBusinessValue: 15000000
    },
    
    governance: {
      boardSize: 5,
      independentDirectors: 3,
      ceoFounder: true,
      votingRights: 'One vote per share',
      auditFirm: 'Deloitte & Touche LLP'
    }
  },
  
  {
    ticker: 'UPXI',
    name: 'Upexi Inc.',
    description: 'E-commerce and digital marketing company transitioning to Solana treasury strategy',
    sector: 'Technology',
    marketCap: 125000000,
    sharesOutstanding: 50000000,
    shareholdersEquity: 32000000,
    totalDebt: 15000000,
    treasury: [
      {
        crypto: 'SOL',
        amount: 52000,
        averageCostBasis: 125.00,
        totalCost: 6500000,
        currentValue: 9646000,
        unrealizedGain: 3146000,
        unrealizedGainPercent: 48.40,
        transactions: [
          {
            id: '5',
            date: '2023-11-10',
            amount: 25000,
            pricePerUnit: 65.00,
            totalCost: 1625000,
            type: 'purchase',
            fundingMethod: 'pipe',
            notes: 'Initial treasury diversification via PIPE',
          },
          {
            id: '6',
            date: '2024-02-15',
            amount: 27000,
            pricePerUnit: 180.56,
            totalCost: 4875000,
            type: 'purchase',
            fundingMethod: 'pipe',
            notes: 'Treasury expansion through PIPE financing',
          },
        ],
        stakingYield: 6.8,
        stakedAmount: 40000,
      },
    ],
    lastUpdated: new Date().toISOString(),
    
    capitalStructure: {
      sharesBasic: 50000000,
      sharesDilutedCurrent: 93900000, // Massive dilution from PIPE
      sharesDilutedAssumed: 95000000,
      sharesFloat: 45000000,
      sharesInsiderOwned: 5000000,
      sharesInstitutionalOwned: 35000000,
      weightedAverageShares: 72000000,
      convertibleDebt: [],
      warrants: [
        {
          id: 'upxi-warrant-1',
          issueDate: '2024-01-01',
          expirationDate: '2027-01-01',
          strikePrice: 2.28,
          sharesPerWarrant: 1,
          totalWarrants: 43900000,
          isOutstanding: true,
          notes: 'Pre-funded warrants from PIPE financing'
        }
      ],
      stockOptions: 3000000,
      restrictedStockUnits: 1500000,
      performanceStockUnits: 500000
    },
    
    executiveCompensation: [
      {
        name: 'Allan Marshall',
        title: 'CEO',
        cashCompensation: 275000,
        equityCompensation: 400000,
        totalCompensation: 675000,
        sharesOwned: 2800000,
        optionsOutstanding: 800000,
        year: 2024
      }
    ],
    
    businessModel: {
      revenueStreams: ['E-commerce platforms', 'Digital marketing services'],
      operatingRevenue: 25000000,
      operatingExpenses: 32000000,
      cashBurnRate: -7000000,
      isTreasuryFocused: false,
      legacyBusinessValue: 80000000
    },
    
    governance: {
      boardSize: 5,
      independentDirectors: 2,
      ceoFounder: false,
      votingRights: 'One vote per share',
      auditFirm: 'BDO USA LLP'
    }
  },
  
  {
    ticker: 'SBET',
    name: 'SharpLink Gaming Ltd.',
    description: 'Blockchain gaming platform with Ethereum treasury strategy and high dilution risk',
    sector: 'Gaming',
    marketCap: 819000000,
    sharesOutstanding: 659680000, // Post-dilution shares
    shareholdersEquity: 45000000,
    totalDebt: 8000000,
    treasury: [
      {
        crypto: 'ETH',
        amount: 8500,
        averageCostBasis: 2850,
        totalCost: 24225000,
        currentValue: 29376000,
        unrealizedGain: 5151000,
        unrealizedGainPercent: 21.26,
        transactions: [
          {
            id: '7',
            date: '2024-01-05',
            amount: 3500,
            pricePerUnit: 2250,
            totalCost: 7875000,
            type: 'purchase',
            fundingMethod: 'pipe',
            notes: 'Initial ETH treasury via PIPE',
          },
          {
            id: '8',
            date: '2024-04-12',
            amount: 5000,
            pricePerUnit: 3270,
            totalCost: 16350000,
            type: 'purchase',
            fundingMethod: 'pipe',
            notes: 'Expanded ETH holdings through PIPE',
          },
        ],
        stakingYield: 3.5,
        stakedAmount: 6000,
      },
    ],
    lastUpdated: new Date().toISOString(),
    
    capitalStructure: {
      sharesBasic: 659680,
      sharesDilutedCurrent: 659680000, // 8,893% dilution
      sharesDilutedAssumed: 660000000,
      sharesFloat: 600000000,
      sharesInsiderOwned: 30000000,
      sharesInstitutionalOwned: 425000000,
      weightedAverageShares: 350000000,
      convertibleDebt: [],
      warrants: [],
      stockOptions: 10000000,
      restrictedStockUnits: 5000000,
      performanceStockUnits: 2000000
    },
    
    executiveCompensation: [
      {
        name: 'David Varga',
        title: 'CEO',
        cashCompensation: 350000,
        equityCompensation: 750000,
        totalCompensation: 1100000,
        sharesOwned: 15000000,
        optionsOutstanding: 2000000,
        year: 2024
      }
    ],
    
    businessModel: {
      revenueStreams: ['Gaming platform fees', 'NFT marketplace', 'Token transactions'],
      operatingRevenue: 8000000,
      operatingExpenses: 22000000,
      cashBurnRate: -14000000,
      isTreasuryFocused: true,
      legacyBusinessValue: 25000000
    },
    
    governance: {
      boardSize: 4,
      independentDirectors: 2,
      ceoFounder: true,
      votingRights: 'One vote per share',
      auditFirm: 'Grant Thornton LLP'
    }
  },
];

// Mock market data
export const marketData: Record<string, MarketData> = {
  MSTR: {
    ticker: 'MSTR',
    price: 1520.50,
    change24h: 45.30,
    change24hPercent: 3.07,
    volume24h: 850000000,
    high24h: 1535.00,
    low24h: 1465.20,
    timestamp: new Date().toISOString(),
  },
  DFDV: {
    ticker: 'DFDV',
    price: 27.25,
    change24h: 2.55,
    change24hPercent: 10.39,
    volume24h: 45000000,
    high24h: 28.15,
    low24h: 24.80,
    timestamp: new Date().toISOString(),
  },
  UPXI: {
    ticker: 'UPXI',
    price: 2.50,
    change24h: 0.08,
    change24hPercent: 3.31,
    volume24h: 3500000,
    high24h: 2.55,
    low24h: 2.40,
    timestamp: new Date().toISOString(),
  },
  SBET: {
    ticker: 'SBET',
    price: 1.24,
    change24h: -0.08,
    change24hPercent: -6.06,
    volume24h: 25000000,
    high24h: 1.35,
    low24h: 1.18,
    timestamp: new Date().toISOString(),
  },
};

// Mock historical data for institutional analysis
export const historicalData: Record<string, HistoricalDataPoint[]> = {
  MSTR: [
    {
      date: '2023-07-01',
      stockPrice: 350.00,
      treasuryValue: 8500000000,
      navPerShare: 125.50,
      premiumToNav: 178.7,
      volume: 450000000,
      sharesOutstanding: 20500000,
      sharesDiluted: 22800000,
      cryptoYield: 18.5,
      impliedVolatility: 85.2,
      beta: 3.2,
      institutionalOwnership: 72.5,
      shortInterest: 8.2,
      borrowCost: 12.5
    },
    {
      date: '2024-07-01',
      stockPrice: 1520.50,
      treasuryValue: 12831184500,
      navPerShare: 455.80,
      premiumToNav: 233.8,
      volume: 850000000,
      sharesOutstanding: 21700000,
      sharesDiluted: 24500000,
      cryptoYield: 26.4,
      impliedVolatility: 106.8,
      beta: 3.8,
      institutionalOwnership: 68.9,
      shortInterest: 15.7,
      borrowCost: 18.2
    }
  ],
  DFDV: [
    {
      date: '2023-07-01',
      stockPrice: 8.50,
      treasuryValue: 65000000,
      navPerShare: 1.85,
      premiumToNav: 359.5,
      volume: 12000000,
      sharesOutstanding: 45000000,
      sharesDiluted: 48000000,
      cryptoYield: 0,
      impliedVolatility: 95.5,
      beta: 2.8,
      institutionalOwnership: 45.2,
      shortInterest: 12.5,
      borrowCost: 25.8
    },
    {
      date: '2024-07-01',
      stockPrice: 27.25,
      treasuryValue: 118828525,
      navPerShare: 1.36,
      premiumToNav: 1903.7,
      volume: 45000000,
      sharesOutstanding: 150000000,
      sharesDiluted: 165000000,
      cryptoYield: 73.1,
      impliedVolatility: 125.3,
      beta: 4.2,
      institutionalOwnership: 56.7,
      shortInterest: 22.3,
      borrowCost: 35.5
    }
  ]
};

// Calculate comprehensive institutional metrics
export function calculateMetrics(company: Company): CalculatedMetrics {
  const historicalDataPoints = historicalData[company.ticker] || [];
  return InstitutionalMetricsEngine.calculateComprehensiveMetrics(company, historicalDataPoints);
}

// Combine companies with their metrics
export const companiesWithMetrics: CompanyWithMetrics[] = companies.map(company => ({
  ...company,
  marketData: marketData[company.ticker],
  metrics: calculateMetrics(company),
  historicalData: historicalData[company.ticker] || []
}));

// Enhanced news data with institutional focus
export const newsItems: NewsItem[] = [
  {
    id: 'news-1',
    title: 'MicroStrategy Reports 26.4% BTC Yield Despite Share Dilution',
    summary: 'MSTR announces strong crypto yield performance, demonstrating successful accretive dilution strategy despite issuing new convertible debt.',
    url: '#',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['MSTR'],
    category: 'company',
    sentiment: 'positive',
  },
  {
    id: 'news-2',
    title: 'DFDV Posts Record 73.1% SOL Yield as Institutional Ownership Grows',
    summary: 'DeFi Development Corp reports exceptional Solana yield while institutional ownership increases to 56.7% amid growing DAT sector interest.',
    url: '#',
    source: 'CoinDesk',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['DFDV'],
    category: 'company',
    sentiment: 'positive',
  },
  {
    id: 'news-3',
    title: 'UPXI Faces Dilution Pressure Following $100M PIPE Financing',
    summary: 'Upexi stock under pressure as massive PIPE financing leads to 8,893% share count increase, raising questions about treasury strategy sustainability.',
    url: '#',
    source: 'The Block',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['UPXI'],
    category: 'company',
    sentiment: 'negative',
  },
  {
    id: 'news-4',
    title: 'SharpLink Gaming Volatility Reaches 125% as PIPE Investors Exit',
    summary: 'SBET implied volatility hits 125% as PIPE financing creates selling pressure, highlighting risks in leveraged crypto treasury strategies.',
    url: '#',
    source: 'Seeking Alpha',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['SBET'],
    category: 'company',
    sentiment: 'negative',
  },
  {
    id: 'news-5',
    title: 'Hedge Funds Increase DAT Exposure Amid Premium Arbitrage Opportunities',
    summary: 'Institutional investors exploiting premium/discount arbitrage in digital asset treasury companies as volatility creates trading opportunities.',
    url: '#',
    source: 'Financial Times',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['MSTR', 'DFDV', 'UPXI', 'SBET'],
    category: 'market',
    sentiment: 'positive',
  },
  {
    id: 'news-6',
    title: 'SEC Scrutinizes Convertible Debt Structures in Crypto Treasury Companies',
    summary: 'Regulatory focus on complex capital structures and dilution disclosure practices among digital asset treasury firms.',
    url: '#',
    source: 'Wall Street Journal',
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['MSTR', 'DFDV'],
    category: 'regulation',
    sentiment: 'negative',
  },
];

export default companiesWithMetrics;