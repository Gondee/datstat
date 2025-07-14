import { NextRequest, NextResponse } from 'next/server';
import AnalyticsOrchestrator from '@/utils/analytics/analyticsOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const orchestrator = new AnalyticsOrchestrator();
    const body = await request.json();
    
    // Validate request
    const { ticker, scenarios, includeRecommendations = true } = body;
    
    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'Ticker is required' },
        { status: 400 }
      );
    }
    
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one scenario is required' },
        { status: 400 }
      );
    }
    
    // Validate scenario structure
    for (const scenario of scenarios) {
      if (!scenario.name) {
        return NextResponse.json(
          { success: false, error: 'Each scenario must have a name' },
          { status: 400 }
        );
      }
      
      if (!scenario.btcPrice && !scenario.ethPrice && !scenario.solPrice && !scenario.assumptions) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Each scenario must have at least one price assumption or custom assumptions' 
          },
          { status: 400 }
        );
      }
    }
    
    // Run scenario analysis
    const analysisResult = await orchestrator.runScenarioAnalysis(
      ticker.toUpperCase(),
      scenarios
    );
    
    // Format response
    const response = {
      ticker: ticker.toUpperCase(),
      baseCase: {
        nav: analysisResult.baseCase.nav.assumedDilutedNAVPerShare,
        treasuryValue: analysisResult.baseCase.nav.components.treasuryValue,
        premiumDiscount: analysisResult.baseCase.nav.premiumDiscount.toAssumedDilutedNAVPercent,
        riskScore: analysisResult.baseCase.risk.riskScore.overallScore
      },
      scenarios: analysisResult.scenarios.map(s => ({
        name: s.name,
        assumptions: s.assumptions,
        impacts: s.impacts,
        probability: s.probability,
        recommendation: s.impacts.navImpact < -20 ? 
          'High downside risk - consider hedging' : 
          s.impacts.navImpact > 50 ? 
          'Strong upside potential' : 
          'Moderate impact expected'
      })),
      recommendations: includeRecommendations ? analysisResult.recommendations : undefined,
      timestamp: analysisResult.timestamp
    };
    
    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error running scenario analysis:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to run scenario analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for pre-defined scenarios
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const type = searchParams.get('type') || 'standard';
    
    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'Ticker is required' },
        { status: 400 }
      );
    }
    
    // Define pre-built scenarios
    let scenarios = [];
    
    switch (type) {
      case 'bull':
        scenarios = [
          {
            name: 'Moderate Bull Market',
            btcPrice: 100000,
            ethPrice: 8000,
            solPrice: 300
          },
          {
            name: 'Strong Bull Market',
            btcPrice: 150000,
            ethPrice: 12000,
            solPrice: 500
          },
          {
            name: 'Extreme Bull Market',
            btcPrice: 250000,
            ethPrice: 20000,
            solPrice: 1000
          }
        ];
        break;
        
      case 'bear':
        scenarios = [
          {
            name: 'Mild Correction',
            btcPrice: 50000,
            ethPrice: 3500,
            solPrice: 150
          },
          {
            name: 'Bear Market',
            btcPrice: 30000,
            ethPrice: 2000,
            solPrice: 80
          },
          {
            name: 'Crypto Winter',
            btcPrice: 20000,
            ethPrice: 1000,
            solPrice: 30
          }
        ];
        break;
        
      case 'volatility':
        scenarios = [
          {
            name: 'High BTC Dominance',
            btcPrice: 100000,
            ethPrice: 3000,
            solPrice: 100
          },
          {
            name: 'ETH Outperformance',
            btcPrice: 60000,
            ethPrice: 10000,
            solPrice: 150
          },
          {
            name: 'Alt Season',
            btcPrice: 50000,
            ethPrice: 5000,
            solPrice: 500
          }
        ];
        break;
        
      case 'standard':
      default:
        scenarios = [
          {
            name: 'Bull Case (1 Year)',
            btcPrice: 100000,
            ethPrice: 8000,
            solPrice: 350
          },
          {
            name: 'Base Case (1 Year)',
            btcPrice: 75000,
            ethPrice: 5500,
            solPrice: 220
          },
          {
            name: 'Bear Case (1 Year)',
            btcPrice: 40000,
            ethPrice: 2500,
            solPrice: 100
          }
        ];
    }
    
    const orchestrator = new AnalyticsOrchestrator();
    const analysisResult = await orchestrator.runScenarioAnalysis(
      ticker.toUpperCase(),
      scenarios
    );
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        scenarioType: type,
        analysis: analysisResult
      }
    });
  } catch (error) {
    console.error('Error fetching scenario templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch scenario templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}