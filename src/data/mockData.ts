import { Company, MarketData, CryptoPrice, CalculatedMetrics, CompanyWithMetrics, NewsItem } from '@/types';

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

// Mock companies data
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
            notes: 'Initial Bitcoin purchase',
          },
          {
            id: '2',
            date: '2024-06-20',
            amount: 11931,
            pricePerUnit: 65883,
            totalCost: 786000000,
            type: 'purchase',
            notes: 'Latest purchase via convertible notes',
          },
        ],
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    ticker: 'DFDV',
    name: 'DeFi Technologies Inc.',
    description: 'Digital asset investment firm focused on DeFi protocols and Solana ecosystem',
    sector: 'Financial Services',
    marketCap: 450000000,
    sharesOutstanding: 150000000,
    shareholdersEquity: 85000000,
    totalDebt: 12000000,
    treasury: [
      {
        crypto: 'SOL',
        amount: 137900,
        averageCostBasis: 142.30,
        totalCost: 19623170,
        currentValue: 25579450,
        unrealizedGain: 5956280,
        unrealizedGainPercent: 30.37,
        transactions: [
          {
            id: '3',
            date: '2024-01-15',
            amount: 50000,
            pricePerUnit: 95.50,
            totalCost: 4775000,
            type: 'purchase',
            notes: 'Strategic Solana acquisition',
          },
          {
            id: '4',
            date: '2024-03-20',
            amount: 87900,
            pricePerUnit: 168.75,
            totalCost: 14831250,
            type: 'purchase',
            notes: 'Increased Solana position',
          },
        ],
        stakingYield: 6.8,
        stakedAmount: 110000,
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    ticker: 'UPXI',
    name: 'Upxi Network',
    description: 'Blockchain infrastructure company building on Solana',
    sector: 'Technology',
    marketCap: 125000000,
    sharesOutstanding: 50000000,
    shareholdersEquity: 32000000,
    totalDebt: 5000000,
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
            notes: 'Initial treasury diversification',
          },
          {
            id: '6',
            date: '2024-02-15',
            amount: 27000,
            pricePerUnit: 180.56,
            totalCost: 4875000,
            type: 'purchase',
            notes: 'Treasury expansion',
          },
        ],
        stakingYield: 6.8,
        stakedAmount: 40000,
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    ticker: 'SBET',
    name: 'SharpLink Gaming Ltd.',
    description: 'Blockchain gaming platform with Ethereum treasury holdings',
    sector: 'Gaming',
    marketCap: 210000000,
    sharesOutstanding: 75000000,
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
            notes: 'Initial ETH treasury',
          },
          {
            id: '8',
            date: '2024-04-12',
            amount: 5000,
            pricePerUnit: 3270,
            totalCost: 16350000,
            type: 'purchase',
            notes: 'Expanded ETH holdings',
          },
        ],
        stakingYield: 3.5,
        stakedAmount: 6000,
      },
    ],
    lastUpdated: new Date().toISOString(),
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
    price: 3.00,
    change24h: 0.15,
    change24hPercent: 5.26,
    volume24h: 12000000,
    high24h: 3.05,
    low24h: 2.82,
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
    price: 2.80,
    change24h: -0.05,
    change24hPercent: -1.75,
    volume24h: 8200000,
    high24h: 2.88,
    low24h: 2.75,
    timestamp: new Date().toISOString(),
  },
};

// Calculate metrics for each company
export function calculateMetrics(company: Company): CalculatedMetrics {
  const treasuryValue = company.treasury.reduce((sum, holding) => sum + holding.currentValue, 0);
  const treasuryValuePerShare = treasuryValue / company.sharesOutstanding;
  const navPerShare = (company.shareholdersEquity + treasuryValue - company.totalDebt) / company.sharesOutstanding;
  const stockPrice = marketData[company.ticker].price;
  const premiumToNav = stockPrice - navPerShare;
  const premiumToNavPercent = (premiumToNav / navPerShare) * 100;
  const debtToTreasuryRatio = company.totalDebt / treasuryValue;

  const treasuryConcentration: CalculatedMetrics['treasuryConcentration'] = {};
  company.treasury.forEach(holding => {
    treasuryConcentration[holding.crypto] = (holding.currentValue / treasuryValue) * 100;
  });

  return {
    ticker: company.ticker,
    treasuryValue,
    treasuryValuePerShare,
    navPerShare,
    stockPrice,
    premiumToNav,
    premiumToNavPercent,
    debtToTreasuryRatio,
    treasuryConcentration,
  };
}

// Combine companies with their metrics
export const companiesWithMetrics: CompanyWithMetrics[] = companies.map(company => ({
  ...company,
  marketData: marketData[company.ticker],
  metrics: calculateMetrics(company),
}));

// Mock news data
export const newsItems: NewsItem[] = [
  {
    id: 'news-1',
    title: 'MicroStrategy Announces $500M Bitcoin Purchase',
    summary: 'MicroStrategy continues its Bitcoin accumulation strategy with another major purchase, bringing total holdings to over 189,000 BTC.',
    url: '#',
    source: 'CoinDesk',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['MSTR'],
    category: 'company',
    sentiment: 'positive',
  },
  {
    id: 'news-2',
    title: 'Solana Hits New 2024 High as DeFi Activity Surges',
    summary: 'SOL price reaches $185 as network activity and DeFi TVL hit record levels, benefiting treasury holders.',
    url: '#',
    source: 'The Block',
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['DFDV', 'UPXI'],
    category: 'crypto',
    sentiment: 'positive',
  },
  {
    id: 'news-3',
    title: 'Ethereum Staking Yields Decrease Following Network Upgrade',
    summary: 'ETH staking yields drop to 3.5% as more validators join the network post-upgrade.',
    url: '#',
    source: 'Decrypt',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['SBET'],
    category: 'crypto',
    sentiment: 'negative',
  },
  {
    id: 'news-4',
    title: 'Digital Asset Treasury Companies Outperform Traditional Tech',
    summary: 'Analysis shows DAT companies delivering superior returns compared to traditional tech stocks in 2024.',
    url: '#',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    relatedTickers: ['MSTR', 'DFDV', 'UPXI', 'SBET'],
    category: 'market',
    sentiment: 'positive',
  },
];