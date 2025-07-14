import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTreasuryHoldingsSummary } from '@/lib/database-utils';

export async function GET() {
  try {
    // Get companies with treasury holdings
    const companies = await prisma.company.findMany({
      include: {
        treasuryHoldings: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // Calculate summary analytics from database data
    let totalTreasuryValue = 0;
    let totalMarketCap = 0;
    let premiumToNavSum = 0;
    let companiesWithPremium = 0;

    companies.forEach(company => {
      // Calculate treasury value for this company
      const companyTreasuryValue = company.treasuryHoldings.reduce(
        (sum, holding) => sum + holding.currentValue,
        0
      );
      totalTreasuryValue += companyTreasuryValue;
      totalMarketCap += company.marketCap;

      // Calculate premium to NAV if we have market data
      if (company.marketData[0] && companyTreasuryValue > 0) {
        const navPerShare = (company.shareholdersEquity + companyTreasuryValue - company.totalDebt) / company.sharesOutstanding;
        const stockPrice = company.marketData[0].price;
        const premiumToNavPercent = navPerShare > 0 ? ((stockPrice - navPerShare) / navPerShare) * 100 : 0;
        premiumToNavSum += premiumToNavPercent;
        companiesWithPremium++;
      }
    });

    const avgPremiumToNav = companiesWithPremium > 0 ? premiumToNavSum / companiesWithPremium : 0;

    // Get treasury holdings summary
    const holdingsSummary = await getTreasuryHoldingsSummary();

    return NextResponse.json({
      success: true,
      data: {
        totalTreasuryValue,
        avgPremiumToNav,
        totalMarketCap,
        companiesCount: companies.length,
        companiesWithTreasury: companies.filter(c => c.treasuryHoldings.length > 0).length,
        holdingsSummary,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}