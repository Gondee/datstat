import { NextRequest, NextResponse } from 'next/server';
import { getCompanyHistoricalData, getCompanyByTicker } from '@/lib/database-utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    const { searchParams } = request.nextUrl;
    
    // Get date range from query params (default to last 30 days)
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());
    const startDate = new Date(
      searchParams.get('startDate') || 
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );
    
    // Verify company exists
    const company = await getCompanyByTicker(ticker);
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company not found',
          message: `No company found with ticker: ${ticker.toUpperCase()}`
        },
        { status: 404 }
      );
    }
    
    // Fetch historical data
    const historicalData = await getCompanyHistoricalData(ticker, startDate, endDate);
    
    // Transform data for charts
    const chartData = historicalData.map(metric => ({
      date: metric.date.toISOString().split('T')[0],
      stockPrice: metric.stockPrice,
      treasuryValue: metric.treasuryValue,
      navPerShare: metric.navPerShare,
      premiumToNav: metric.premiumToNav,
      premiumToNavPercent: (metric.premiumToNav / metric.navPerShare) * 100,
      volume: metric.volume,
      sharesOutstanding: metric.sharesOutstanding,
      sharesDiluted: metric.sharesDiluted,
      cryptoYield: metric.cryptoYield,
      impliedVolatility: metric.impliedVolatility,
      beta: metric.beta,
      institutionalOwnership: metric.institutionalOwnership,
      shortInterest: metric.shortInterest,
      borrowCost: metric.borrowCost
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataPoints: chartData.length,
        historical: chartData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch historical data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}