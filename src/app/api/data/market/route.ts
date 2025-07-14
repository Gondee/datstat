import { NextResponse } from 'next/server';
import { cryptoPrices } from '@/data/mockData';

export async function GET() {
  try {
    // Return mock crypto prices for now
    // TODO: Replace with real market data API
    return NextResponse.json({
      success: true,
      data: {
        crypto: cryptoPrices,
        stocks: {}, // Empty for now
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}