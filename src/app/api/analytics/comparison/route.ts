import { NextRequest, NextResponse } from 'next/server';
import AnalyticsOrchestrator from '@/utils/analytics/analyticsOrchestrator';

export async function GET(request: NextRequest) {
  try {
    const orchestrator = new AnalyticsOrchestrator();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const tickers = searchParams.get('tickers')?.split(',').map(t => t.toUpperCase());
    const metrics = searchParams.get('metrics')?.split(',') || ['all'];
    
    // Get comparative analytics
    const comparativeData = await orchestrator.getComparativeAnalytics(tickers);
    
    // Filter metrics if specific ones requested
    let filteredData = comparativeData;
    if (!metrics.includes('all')) {
      // Filter based on requested metrics
      const allowedMetrics = new Set(metrics);
      
      if (!allowedMetrics.has('rankings')) {
        delete filteredData.rankings;
      }
      if (!allowedMetrics.has('efficiency')) {
        delete filteredData.efficiencyFrontier;
      }
      if (!allowedMetrics.has('correlations')) {
        delete filteredData.comparative.correlations;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...filteredData,
        requestedMetrics: metrics,
        companyCount: comparativeData.companies.length
      }
    });
  } catch (error) {
    console.error('Error fetching comparative data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch comparative data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orchestrator = new AnalyticsOrchestrator();
    const body = await request.json();
    
    // Validate request
    const { tickers, analysisType, parameters } = body;
    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tickers array' },
        { status: 400 }
      );
    }
    
    // Perform custom comparative analysis
    const comparativeData = await orchestrator.getComparativeAnalytics(
      tickers.map(t => t.toUpperCase())
    );
    
    // Apply custom analysis based on type
    let result = comparativeData;
    
    switch (analysisType) {
      case 'efficiency':
        result = {
          ...comparativeData,
          efficiencyFrontier: comparativeData.efficiencyFrontier
        };
        break;
        
      case 'value':
        result = {
          ...comparativeData,
          comparative: {
            relativeValue: comparativeData.comparative.relativeValue
          }
        };
        break;
        
      case 'correlation':
        result = {
          ...comparativeData,
          comparative: {
            correlations: comparativeData.comparative.correlations
          }
        };
        break;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        analysisType: analysisType || 'comprehensive',
        companies: tickers,
        results: result,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error performing comparative analysis:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform comparative analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}