import { PrismaClient, CryptoType, TransactionType, FundingMethod, Role, DataSourceType, DataSourceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin users with proper password hashing
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@datstat.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  // Hash the password properly
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword, // Update password if user exists
      name: adminName,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: Role.ADMIN,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create additional sample users for testing
  const editorUser = await prisma.adminUser.upsert({
    where: { email: 'editor@datstat.com' },
    update: {},
    create: {
      email: 'editor@datstat.com',
      password: await bcrypt.hash('editor123', 12),
      name: 'Editor User',
      role: Role.EDITOR,
    },
  });

  const viewerUser = await prisma.adminUser.upsert({
    where: { email: 'viewer@datstat.com' },
    update: {},
    create: {
      email: 'viewer@datstat.com',
      password: await bcrypt.hash('viewer123', 12),
      name: 'Viewer User',
      role: Role.VIEWER,
    },
  });

  console.log('✅ Created test users:', editorUser.email, viewerUser.email);

  // Create data sources
  const dataSources = await Promise.all([
    prisma.dataSource.upsert({
      where: { name: 'CoinGecko API' },
      update: {},
      create: {
        name: 'CoinGecko API',
        type: DataSourceType.CRYPTO_PRICE_API,
        url: 'https://api.coingecko.com/api/v3',
        status: DataSourceStatus.ACTIVE,
        syncFrequency: '5m',
        config: {
          rateLimit: 50,
          timeout: 30000,
        },
      },
    }),
    prisma.dataSource.upsert({
      where: { name: 'Alpha Vantage' },
      update: {},
      create: {
        name: 'Alpha Vantage',
        type: DataSourceType.STOCK_PRICE_API,
        url: 'https://www.alphavantage.co/query',
        status: DataSourceStatus.ACTIVE,
        syncFrequency: '1h',
        config: {
          rateLimit: 5,
          timeout: 30000,
        },
      },
    }),
  ]);

  console.log('✅ Created data sources');

  // Create sample companies
  const companies = [
    {
      ticker: 'MSTR',
      name: 'MicroStrategy Incorporated',
      description: 'Enterprise analytics and mobility platform provider with significant Bitcoin treasury holdings',
      sector: 'Technology',
      marketCap: 45000000000,
      sharesOutstanding: 11500000,
      shareholdersEquity: 2800000000,
      totalDebt: 2400000000,
      revenueStreams: ['Software Licenses', 'Cloud Services', 'Professional Services'],
      operatingRevenue: 500000000,
      operatingExpenses: 450000000,
      cashBurnRate: 25000000,
      isTreasuryFocused: true,
      legacyBusinessValue: 1500000000,
      boardSize: 7,
      independentDirectors: 4,
      ceoFounder: false,
      votingRights: 'One vote per share',
      auditFirm: 'PricewaterhouseCoopers LLP',
    },
    {
      ticker: 'TSLA',
      name: 'Tesla, Inc.',
      description: 'Electric vehicle and clean energy company with Bitcoin treasury holdings',
      sector: 'Automotive',
      marketCap: 800000000000,
      sharesOutstanding: 3170000000,
      shareholdersEquity: 62300000000,
      totalDebt: 9600000000,
      revenueStreams: ['Vehicle Sales', 'Energy Storage', 'Solar Panels', 'Software Services'],
      operatingRevenue: 96000000000,
      operatingExpenses: 87000000000,
      cashBurnRate: -2000000000, // Positive cash flow
      isTreasuryFocused: false,
      legacyBusinessValue: 750000000000,
      boardSize: 8,
      independentDirectors: 6,
      ceoFounder: true,
      votingRights: 'One vote per share',
      auditFirm: 'PricewaterhouseCoopers LLP',
    },
    {
      ticker: 'COIN',
      name: 'Coinbase Global, Inc.',
      description: 'Cryptocurrency exchange platform with diverse crypto treasury holdings',
      sector: 'Financial Services',
      marketCap: 55000000000,
      sharesOutstanding: 250000000,
      shareholdersEquity: 8500000000,
      totalDebt: 3200000000,
      revenueStreams: ['Trading Fees', 'Subscription Services', 'Custody Services', 'Staking Rewards'],
      operatingRevenue: 3100000000,
      operatingExpenses: 2800000000,
      cashBurnRate: 100000000,
      isTreasuryFocused: true,
      legacyBusinessValue: 20000000000,
      boardSize: 9,
      independentDirectors: 6,
      ceoFounder: true,
      votingRights: 'Dual-class structure',
      auditFirm: 'Deloitte & Touche LLP',
    },
  ];

  const createdCompanies = [];
  for (const companyData of companies) {
    const company = await prisma.company.upsert({
      where: { ticker: companyData.ticker },
      update: companyData,
      create: companyData,
    });
    createdCompanies.push(company);
    console.log(`✅ Created company: ${company.name} (${company.ticker})`);
  }

  // Create treasury holdings for each company
  const treasuryData = [
    {
      companyTicker: 'MSTR',
      holdings: [
        { crypto: CryptoType.BTC, amount: 193780, averageCostBasis: 31224, stakingYield: 0 },
      ],
    },
    {
      companyTicker: 'TSLA',
      holdings: [
        { crypto: CryptoType.BTC, amount: 9720, averageCostBasis: 34722, stakingYield: 0 },
      ],
    },
    {
      companyTicker: 'COIN',
      holdings: [
        { crypto: CryptoType.BTC, amount: 9181, averageCostBasis: 29855, stakingYield: 0 },
        { crypto: CryptoType.ETH, amount: 52863, averageCostBasis: 2476, stakingYield: 3.2 },
        { crypto: CryptoType.SOL, amount: 1500, averageCostBasis: 45.50, stakingYield: 6.8 },
      ],
    },
  ];

  // Current crypto prices for calculations (these would come from real API)
  const currentPrices = {
    BTC: 67500,
    ETH: 3250,
    SOL: 185,
  };

  for (const { companyTicker, holdings } of treasuryData) {
    const company = createdCompanies.find(c => c.ticker === companyTicker);
    if (!company) continue;

    for (const holdingData of holdings) {
      const currentPrice = currentPrices[holdingData.crypto];
      const totalCost = holdingData.amount * holdingData.averageCostBasis;
      const currentValue = holdingData.amount * currentPrice;
      const unrealizedGain = currentValue - totalCost;
      const unrealizedGainPercent = (unrealizedGain / totalCost) * 100;

      const holding = await prisma.treasuryHolding.upsert({
        where: {
          id: `${company.id}-${holdingData.crypto}`,
        },
        update: {
          amount: holdingData.amount,
          averageCostBasis: holdingData.averageCostBasis,
          totalCost,
          currentValue,
          unrealizedGain,
          unrealizedGainPercent,
          stakingYield: holdingData.stakingYield > 0 ? holdingData.stakingYield : null,
          stakedAmount: holdingData.stakingYield > 0 ? holdingData.amount * 0.8 : null,
        },
        create: {
          id: `${company.id}-${holdingData.crypto}`,
          companyId: company.id,
          crypto: holdingData.crypto,
          amount: holdingData.amount,
          averageCostBasis: holdingData.averageCostBasis,
          totalCost,
          currentValue,
          unrealizedGain,
          unrealizedGainPercent,
          stakingYield: holdingData.stakingYield > 0 ? holdingData.stakingYield : null,
          stakedAmount: holdingData.stakingYield > 0 ? holdingData.amount * 0.8 : null,
        },
      });

      console.log(`✅ Created treasury holding: ${company.ticker} - ${holdingData.crypto}`);

      // Create sample transactions for each holding
      const sampleTransactions = [
        {
          date: new Date('2023-01-15'),
          amount: holdingData.amount * 0.3,
          pricePerUnit: holdingData.averageCostBasis * 0.85,
          type: TransactionType.PURCHASE,
          fundingMethod: FundingMethod.EQUITY,
        },
        {
          date: new Date('2023-06-20'),
          amount: holdingData.amount * 0.4,
          pricePerUnit: holdingData.averageCostBasis * 1.1,
          type: TransactionType.PURCHASE,
          fundingMethod: FundingMethod.CONVERTIBLE_DEBT,
        },
        {
          date: new Date('2024-02-10'),
          amount: holdingData.amount * 0.3,
          pricePerUnit: holdingData.averageCostBasis * 1.05,
          type: TransactionType.PURCHASE,
          fundingMethod: FundingMethod.CREDIT_FACILITY,
        },
      ];

      for (const txData of sampleTransactions) {
        await prisma.treasuryTransaction.create({
          data: {
            companyId: company.id,
            holdingId: holding.id,
            date: txData.date,
            amount: txData.amount,
            pricePerUnit: txData.pricePerUnit,
            totalCost: txData.amount * txData.pricePerUnit,
            type: txData.type,
            fundingMethod: txData.fundingMethod,
            notes: `Sample ${txData.type.toLowerCase()} transaction`,
          },
        });
      }
    }
  }

  // Create capital structure data
  for (const company of createdCompanies) {
    const capitalStructure = await prisma.capitalStructure.upsert({
      where: { companyId: company.id },
      update: {},
      create: {
        companyId: company.id,
        sharesBasic: company.sharesOutstanding,
        sharesDilutedCurrent: company.sharesOutstanding * 1.1,
        sharesDilutedAssumed: company.sharesOutstanding * 1.25,
        sharesFloat: company.sharesOutstanding * 0.85,
        sharesInsiderOwned: company.sharesOutstanding * 0.15,
        sharesInstitutionalOwned: company.sharesOutstanding * 0.70,
        weightedAverageShares: company.sharesOutstanding * 1.05,
        stockOptions: company.sharesOutstanding * 0.08,
        restrictedStockUnits: company.sharesOutstanding * 0.03,
        performanceStockUnits: company.sharesOutstanding * 0.02,
      },
    });

    // Add convertible debt if applicable
    if (company.ticker === 'MSTR') {
      await prisma.convertibleDebt.create({
        data: {
          capitalStructureId: capitalStructure.id,
          issueDate: new Date('2023-03-15'),
          maturityDate: new Date('2028-03-15'),
          principal: 500000000,
          interestRate: 0.625,
          conversionPrice: 397.99,
          conversionRatio: 2.5126,
          currentValue: 520000000,
          isOutstanding: true,
          notes: '0.625% Convertible Senior Notes due 2028',
        },
      });
    }

    console.log(`✅ Created capital structure for ${company.ticker}`);
  }

  // Create executive compensation data
  const executiveData = [
    {
      companyTicker: 'MSTR',
      executives: [
        {
          name: 'Michael J. Saylor',
          title: 'Executive Chairman',
          year: 2023,
          cashCompensation: 1000000,
          equityCompensation: 0,
          cryptoCompensation: 0,
          sharesOwned: 2000000,
          optionsOutstanding: 0,
        },
        {
          name: 'Phong Le',
          title: 'Chief Executive Officer',
          year: 2023,
          cashCompensation: 1000000,
          equityCompensation: 15000000,
          cryptoCompensation: 0,
          sharesOwned: 150000,
          optionsOutstanding: 75000,
        },
      ],
    },
  ];

  for (const { companyTicker, executives } of executiveData) {
    const company = createdCompanies.find(c => c.ticker === companyTicker);
    if (!company) continue;

    for (const execData of executives) {
      await prisma.executiveCompensation.upsert({
        where: {
          companyId_name_year: {
            companyId: company.id,
            name: execData.name,
            year: execData.year,
          },
        },
        update: execData,
        create: {
          ...execData,
          companyId: company.id,
          totalCompensation: execData.cashCompensation + execData.equityCompensation + (execData.cryptoCompensation || 0),
        },
      });
    }

    console.log(`✅ Created executive compensation for ${company.ticker}`);
  }

  // Create market data
  for (const company of createdCompanies) {
    const stockPrice = company.marketCap / company.sharesOutstanding;
    
    await prisma.marketData.create({
      data: {
        ticker: company.ticker,
        companyId: company.id,
        price: stockPrice,
        change24h: stockPrice * (Math.random() * 0.1 - 0.05), // Random ±5%
        change24hPercent: Math.random() * 10 - 5, // Random ±5%
        volume24h: Math.random() * 10000000,
        high24h: stockPrice * 1.03,
        low24h: stockPrice * 0.97,
        timestamp: new Date(),
      },
    });
  }

  // Create crypto market data
  for (const [symbol, price] of Object.entries(currentPrices)) {
    await prisma.marketData.create({
      data: {
        ticker: symbol,
        symbol: symbol,
        price: price,
        change24h: price * (Math.random() * 0.1 - 0.05),
        change24hPercent: Math.random() * 10 - 5,
        volume24h: Math.random() * 1000000000,
        high24h: price * 1.04,
        low24h: price * 0.96,
        marketCap: price * 19700000, // Approximate circulating supply
        timestamp: new Date(),
      },
    });
  }

  console.log('✅ Created market data');

  // Create historical metrics for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (const company of createdCompanies) {
    const stockPrice = company.marketCap / company.sharesOutstanding;
    const treasuryValue = company.ticker === 'MSTR' ? 193780 * currentPrices.BTC :
                         company.ticker === 'TSLA' ? 9720 * currentPrices.BTC :
                         9181 * currentPrices.BTC + 52863 * currentPrices.ETH + 1500 * currentPrices.SOL;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayStockPrice = stockPrice * (0.95 + Math.random() * 0.1); // ±5% variation
      const dayTreasuryValue = treasuryValue * (0.95 + Math.random() * 0.1);
      const navPerShare = (company.shareholdersEquity + dayTreasuryValue) / company.sharesOutstanding;
      
      await prisma.historicalMetric.create({
        data: {
          companyId: company.id,
          date: new Date(d),
          stockPrice: dayStockPrice,
          treasuryValue: dayTreasuryValue,
          navPerShare: navPerShare,
          premiumToNav: dayStockPrice - navPerShare,
          volume: Math.random() * 5000000,
          sharesOutstanding: company.sharesOutstanding,
          sharesDiluted: company.sharesOutstanding * 1.1,
          cryptoYield: company.ticker === 'COIN' ? 4.2 : 0,
          impliedVolatility: 0.3 + Math.random() * 0.4,
          beta: 1.0 + Math.random() * 1.0,
          institutionalOwnership: 0.65 + Math.random() * 0.1,
          shortInterest: Math.random() * 0.15,
          borrowCost: Math.random() * 0.05,
        },
      });
    }

    console.log(`✅ Created historical metrics for ${company.ticker}`);
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });