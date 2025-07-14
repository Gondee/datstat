import { NextRequest, NextResponse } from 'next/server';
import AnalyticsOrchestrator from '@/utils/analytics/analyticsOrchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    const orchestrator = new AnalyticsOrchestrator();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeStressTest = searchParams.get('stressTest') === 'true';
    const includeVaR = searchParams.get('var') === 'true';
    const riskTypes = searchParams.get('types')?.split(',') || ['all'];
    
    // Get risk assessment
    const riskData = await orchestrator.getRiskAssessment(ticker.toUpperCase());
    
    // Filter risk types if specific ones requested
    let filteredRiskData = { ...riskData };
    if (!riskTypes.includes('all')) {
      const allowedTypes = new Set(riskTypes);
      
      // Keep only requested risk types
      const filtered: any = {
        riskScore: riskData.riskScore,
        timestamp: new Date()
      };
      
      if (allowedTypes.has('market')) filtered.marketRisk = riskData.marketRisk;
      if (allowedTypes.has('concentration')) filtered.concentrationRisk = riskData.concentrationRisk;
      if (allowedTypes.has('liquidity')) filtered.liquidityRisk = riskData.liquidityRisk;
      if (allowedTypes.has('credit')) filtered.creditRisk = riskData.creditRisk;
      if (allowedTypes.has('operational')) filtered.operationalRisk = riskData.operationalRisk;
      if (allowedTypes.has('correlation')) filtered.correlationAnalysis = riskData.correlationAnalysis;
      
      if (includeVaR && allowedTypes.has('var')) {
        filtered.varAnalysis = riskData.varAnalysis;
      }
      
      if (includeStressTest && allowedTypes.has('stress')) {
        filtered.stressTest = riskData.stressTest;
      }
      
      filteredRiskData = filtered;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        risk: filteredRiskData,
        summary: {
          overallScore: riskData.riskScore.overallScore,
          category: riskData.riskScore.category,
          keyRisks: riskData.riskScore.keyRisks,
          recommendations: riskData.riskScore.mitigationRecommendations
        }
      }
    });
  } catch (error) {
    console.error('Error fetching risk data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch risk data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}