import { NextRequest, NextResponse } from 'next/server';
import { ApiResponseBuilder } from '../utils/response';
import { ExportFormat, ExportRequest } from '../types';
import { prisma } from '@/lib/prisma';

// CSV export helper
function exportToCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) return '';

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(','),
    ...data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  return csvContent;
}

// JSON export helper
function exportToJSON(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

// Excel export helper (simplified - in production use a proper library)
function exportToExcel(data: any[]): Buffer {
  // This is a simplified version - in production, use a library like exceljs
  const csv = exportToCSV(data);
  return Buffer.from(csv, 'utf-8');
}

// PDF export helper (simplified - in production use a proper library)
function exportToPDF(data: any[], title: string): Buffer {
  // This is a simplified version - in production, use a library like pdfkit
  const content = `
    ${title}
    Generated: ${new Date().toISOString()}
    
    ${JSON.stringify(data, null, 2)}
  `;
  return Buffer.from(content, 'utf-8');
}

// Export companies data
export async function exportCompanies(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'json') as ExportFormat;
  const sector = searchParams.get('sector');
  const hasTreasury = searchParams.get('hasTreasury') === 'true';

  try {
    const where: any = {};
    if (sector) where.sector = sector;
    if (hasTreasury) where.treasury = { some: {} };

    const companies = await prisma.company.findMany({
      where,
      include: {
        treasury: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // Get crypto prices for calculations
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Transform data for export
    const exportData = companies.map(company => {
      let treasuryValue = 0;
      const holdings: Record<string, number> = {};

      company.treasury.forEach(holding => {
        const value = holding.amount * (priceMap.get(holding.crypto) || 0);
        treasuryValue += value;
        holdings[`${holding.crypto}_amount`] = holding.amount;
        holdings[`${holding.crypto}_value`] = value;
      });

      return {
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        marketCap: company.marketCap,
        stockPrice: company.marketData?.[0]?.price || 0,
        sharesOutstanding: company.sharesOutstanding,
        treasuryValue,
        ...holdings,
        navPerShare: (company.shareholdersEquity + treasuryValue - company.totalDebt) / company.sharesOutstanding,
        lastUpdated: company.lastUpdated,
      };
    });

    // Generate export based on format
    let content: string | Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = exportToCSV(exportData);
        contentType = 'text/csv';
        filename = `companies_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'excel':
        content = exportToExcel(exportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `companies_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      
      case 'pdf':
        content = exportToPDF(exportData, 'Company Treasury Holdings Report');
        contentType = 'application/pdf';
        filename = `companies_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      
      case 'json':
      default:
        content = exportToJSON(exportData);
        contentType = 'application/json';
        filename = `companies_${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting companies:', error);
    return ApiResponseBuilder.internalError('Failed to export companies data');
  }
}

// Export treasury holdings data
export async function exportTreasuryHoldings(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'json') as ExportFormat;
  const ticker = searchParams.get('ticker');

  try {
    const where: any = {};
    if (ticker) {
      where.company = { ticker: ticker.toUpperCase() };
    }

    const holdings = await prisma.treasuryHolding.findMany({
      where,
      include: {
        company: {
          select: {
            ticker: true,
            name: true,
            marketCap: true,
          },
        },
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    // Get current crypto prices
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Transform data for export
    const exportData = holdings.map(holding => {
      const currentPrice = priceMap.get(holding.crypto) || 0;
      const currentValue = holding.amount * currentPrice;
      const unrealizedGain = currentValue - holding.totalCost;
      const unrealizedGainPercent = holding.totalCost > 0
        ? (unrealizedGain / holding.totalCost) * 100
        : 0;

      return {
        ticker: holding.company.ticker,
        companyName: holding.company.name,
        crypto: holding.crypto,
        amount: holding.amount,
        averageCostBasis: holding.averageCostBasis,
        totalCost: holding.totalCost,
        currentPrice,
        currentValue,
        unrealizedGain,
        unrealizedGainPercent,
        transactionCount: holding.transactions.length,
        lastTransaction: holding.transactions[0]?.date || null,
      };
    });

    // Generate export based on format
    let content: string | Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = exportToCSV(exportData);
        contentType = 'text/csv';
        filename = `treasury_holdings_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'excel':
        content = exportToExcel(exportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `treasury_holdings_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      
      case 'pdf':
        content = exportToPDF(exportData, 'Treasury Holdings Report');
        contentType = 'application/pdf';
        filename = `treasury_holdings_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      
      case 'json':
      default:
        content = exportToJSON(exportData);
        contentType = 'application/json';
        filename = `treasury_holdings_${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting treasury holdings:', error);
    return ApiResponseBuilder.internalError('Failed to export treasury holdings');
  }
}

// Export analytics report
export async function exportAnalyticsReport(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  const format = (searchParams.get('format') || 'pdf') as ExportFormat;

  if (!ticker) {
    return ApiResponseBuilder.badRequest('Ticker parameter required');
  }

  try {
    const company = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
      include: {
        treasury: {
          include: {
            transactions: {
              orderBy: { date: 'desc' },
              take: 10,
            },
          },
        },
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 30,
        },
        capitalStructure: {
          include: {
            convertibleDebt: true,
            warrants: true,
          },
        },
        executiveCompensation: {
          orderBy: { year: 'desc' },
          take: 3,
        },
      },
    });

    if (!company) {
      return ApiResponseBuilder.notFound('Company');
    }

    // Get crypto prices
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate metrics
    let treasuryValue = 0;
    const treasuryBreakdown = company.treasury.map(holding => {
      const currentPrice = priceMap.get(holding.crypto) || 0;
      const currentValue = holding.amount * currentPrice;
      treasuryValue += currentValue;

      return {
        crypto: holding.crypto,
        amount: holding.amount,
        averageCost: holding.averageCostBasis,
        currentPrice,
        currentValue,
        unrealizedGain: currentValue - holding.totalCost,
        unrealizedGainPercent: holding.totalCost > 0
          ? ((currentValue - holding.totalCost) / holding.totalCost) * 100
          : 0,
      };
    });

    const navPerShare = (company.shareholdersEquity + treasuryValue - company.totalDebt) / company.sharesOutstanding;
    const stockPrice = company.marketData?.[0]?.price || 0;
    const premiumToNav = stockPrice - navPerShare;
    const premiumToNavPercent = navPerShare > 0 ? (premiumToNav / navPerShare) * 100 : 0;

    // Create report data
    const reportData = {
      reportDate: new Date().toISOString(),
      company: {
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        description: company.description,
      },
      marketMetrics: {
        marketCap: company.marketCap,
        stockPrice,
        sharesOutstanding: company.sharesOutstanding,
        change24h: company.marketData?.[0]?.change24hPercent || 0,
        volume24h: company.marketData?.[0]?.volume24h || 0,
      },
      treasuryMetrics: {
        totalValue: treasuryValue,
        totalCost: company.treasury.reduce((sum, h) => sum + h.totalCost, 0),
        unrealizedGain: treasuryValue - company.treasury.reduce((sum, h) => sum + h.totalCost, 0),
        holdings: treasuryBreakdown,
      },
      valuationMetrics: {
        navPerShare,
        premiumToNav,
        premiumToNavPercent,
        debtToTreasuryRatio: treasuryValue > 0 ? company.totalDebt / treasuryValue : 0,
        treasuryPerShare: treasuryValue / company.sharesOutstanding,
      },
      capitalStructure: {
        sharesBasic: company.capitalStructure?.sharesBasic || company.sharesOutstanding,
        sharesDiluted: company.capitalStructure?.sharesDilutedCurrent || company.sharesOutstanding,
        totalDebt: company.totalDebt,
        shareholdersEquity: company.shareholdersEquity,
        convertibleDebt: company.capitalStructure?.convertibleDebt || [],
        warrants: company.capitalStructure?.warrants || [],
      },
      executiveCompensation: company.executiveCompensation,
      recentTransactions: company.treasury.flatMap(h => 
        h.transactions.slice(0, 5).map(t => ({
          date: t.date,
          crypto: h.crypto,
          type: t.type,
          amount: t.amount,
          pricePerUnit: t.pricePerUnit,
          totalCost: t.totalCost,
        }))
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };

    // Generate export based on format
    let content: string | Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = exportToJSON([reportData]);
        contentType = 'application/json';
        filename = `${ticker}_analytics_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'pdf':
      default:
        // In production, use a proper PDF generation library
        content = exportToPDF([reportData], `Analytics Report - ${company.name} (${company.ticker})`);
        contentType = 'application/pdf';
        filename = `${ticker}_analytics_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting analytics report:', error);
    return ApiResponseBuilder.internalError('Failed to export analytics report');
  }
}