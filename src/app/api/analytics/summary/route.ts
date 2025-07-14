import { NextResponse } from 'next/server';
import { companiesWithMetrics } from '@/data/mockData';

export async function GET() {
  try {
    // Calculate summary analytics from mock data
    const totalTreasuryValue = companiesWithMetrics.reduce(
      (sum, company) => sum + company.metrics.treasuryValue,
      0
    );
    
    const avgPremiumToNav = companiesWithMetrics.reduce(
      (sum, company) => sum + company.metrics.premiumToNavPercent,
      0
    ) / companiesWithMetrics.length;
    
    const totalMarketCap = companiesWithMetrics.reduce(
      (sum, company) => sum + company.marketCap,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalTreasuryValue,
        avgPremiumToNav,
        totalMarketCap,
        companiesCount: companiesWithMetrics.length,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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