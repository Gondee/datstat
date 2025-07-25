import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CacheKeyGenerator } from '@/lib/performance/cache-utils';
import { dbMonitor } from '@/lib/performance/db-optimization';

// GET /api/admin/companies - List all companies
export async function GET() {
  try {
    const companiesData = await prisma.company.findMany({
      include: {
        treasuryHoldings: {
          include: {
            transactions: true
          }
        },
        executiveCompensation: true,
        capitalStructure: {
          include: {
            convertibleDebt: true,
            warrants: true
          }
        }
      },
      orderBy: {
        ticker: 'asc'
      }
    });

    // Transform data to match expected Company type structure
    const companies = companiesData.map(company => ({
      ticker: company.ticker,
      name: company.name,
      description: company.description || '',
      sector: company.sector,
      marketCap: company.marketCap,
      sharesOutstanding: company.sharesOutstanding,
      shareholdersEquity: company.shareholdersEquity,
      totalDebt: company.totalDebt,
      lastUpdated: company.lastUpdated.toISOString(),
      
      // Transform treasury holdings
      treasury: company.treasuryHoldings.map(holding => ({
        crypto: holding.crypto,
        amount: holding.amount,
        averageCostBasis: holding.averageCostBasis,
        totalCost: holding.totalCost,
        currentValue: holding.currentValue,
        unrealizedGain: holding.unrealizedGain,
        unrealizedGainPercent: holding.unrealizedGainPercent,
        transactions: holding.transactions.map(tx => ({
          id: tx.id,
          date: tx.date.toISOString(),
          amount: tx.amount,
          pricePerUnit: tx.pricePerUnit,
          totalCost: tx.totalCost,
          type: tx.type.toLowerCase() as 'purchase' | 'sale' | 'stake' | 'unstake',
          fundingMethod: tx.fundingMethod?.toLowerCase() as any,
          notes: tx.notes || undefined
        })),
        stakingYield: holding.stakingYield || undefined,
        stakedAmount: holding.stakedAmount || undefined
      })),
      
      // Business model
      businessModel: {
        revenueStreams: company.revenueStreams,
        operatingRevenue: company.operatingRevenue,
        operatingExpenses: company.operatingExpenses,
        cashBurnRate: company.cashBurnRate,
        isTreasuryFocused: company.isTreasuryFocused,
        legacyBusinessValue: company.legacyBusinessValue
      },
      
      // Governance
      governance: {
        boardSize: company.boardSize,
        independentDirectors: company.independentDirectors,
        ceoFounder: company.ceoFounder,
        votingRights: company.votingRights || '',
        auditFirm: company.auditFirm || ''
      },
      
      // Capital structure
      capitalStructure: company.capitalStructure ? {
        sharesBasic: company.capitalStructure.sharesBasic,
        sharesDilutedCurrent: company.capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: company.capitalStructure.sharesDilutedAssumed,
        sharesFloat: company.capitalStructure.sharesFloat,
        sharesInsiderOwned: company.capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: company.capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: company.capitalStructure.weightedAverageShares,
        stockOptions: company.capitalStructure.stockOptions,
        restrictedStockUnits: company.capitalStructure.restrictedStockUnits,
        performanceStockUnits: company.capitalStructure.performanceStockUnits,
        convertibleDebt: company.capitalStructure.convertibleDebt.map(debt => ({
          id: debt.id,
          issueDate: debt.issueDate.toISOString(),
          maturityDate: debt.maturityDate.toISOString(),
          principal: debt.principal,
          interestRate: debt.interestRate,
          conversionPrice: debt.conversionPrice,
          conversionRatio: debt.conversionRatio,
          currentValue: debt.currentValue,
          isOutstanding: debt.isOutstanding,
          notes: debt.notes || undefined
        })),
        warrants: company.capitalStructure.warrants.map(warrant => ({
          id: warrant.id,
          issueDate: warrant.issueDate.toISOString(),
          expirationDate: warrant.expirationDate.toISOString(),
          strikePrice: warrant.strikePrice,
          sharesPerWarrant: warrant.sharesPerWarrant,
          totalWarrants: warrant.totalWarrants,
          isOutstanding: warrant.isOutstanding,
          notes: warrant.notes || undefined
        }))
      } : {
        sharesBasic: company.sharesOutstanding,
        sharesDilutedCurrent: company.sharesOutstanding,
        sharesDilutedAssumed: company.sharesOutstanding,
        sharesFloat: company.sharesOutstanding,
        sharesInsiderOwned: 0,
        sharesInstitutionalOwned: 0,
        weightedAverageShares: company.sharesOutstanding,
        stockOptions: 0,
        restrictedStockUnits: 0,
        performanceStockUnits: 0,
        convertibleDebt: [],
        warrants: []
      },
      
      // Executive compensation
      executiveCompensation: company.executiveCompensation
    }));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/admin/companies - Create new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      ticker,
      name,
      description,
      sector,
      marketCap,
      sharesOutstanding,
      shareholdersEquity,
      totalDebt,
      businessModel,
      capitalStructure,
      governance
    } = body;

    // Validate required fields (only ticker and name)
    if (!ticker || !name) {
      return NextResponse.json(
        { error: 'Ticker and name are required' },
        { status: 400 }
      );
    }

    // Check if company already exists
    const existingCompany = await prisma.company.findUnique({
      where: { ticker }
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company with this ticker already exists' },
        { status: 409 }
      );
    }

    const company = await prisma.company.create({
      data: {
        ticker: ticker.toUpperCase(),
        name,
        description: description || '',
        sector: sector || 'Unknown',
        marketCap: marketCap || 0,
        sharesOutstanding: sharesOutstanding || 1000000, // Default 1M shares
        shareholdersEquity: shareholdersEquity || 0,
        totalDebt: totalDebt || 0,
        // Business model fields are directly on Company model
        revenueStreams: businessModel?.revenueStreams || [],
        operatingRevenue: businessModel?.operatingRevenue || 0,
        operatingExpenses: businessModel?.operatingExpenses || 0,
        cashBurnRate: businessModel?.cashBurnRate || 0,
        isTreasuryFocused: businessModel?.isTreasuryFocused || true, // Default to treasury-focused
        legacyBusinessValue: businessModel?.legacyBusinessValue || 0,
        // Governance fields are directly on Company model  
        boardSize: governance?.boardSize || 5, // Default board size
        independentDirectors: governance?.independentDirectors || 3,
        ceoFounder: governance?.ceoFounder || false,
        votingRights: governance?.votingRights || 'standard',
        auditFirm: governance?.auditFirm || '',
        capitalStructure: capitalStructure ? {
          create: {
            sharesBasic: capitalStructure.sharesBasic || sharesOutstanding || 1000000,
            sharesDilutedCurrent: capitalStructure.sharesDilutedCurrent || sharesOutstanding || 1000000,
            sharesDilutedAssumed: capitalStructure.sharesDilutedAssumed || sharesOutstanding || 1000000,
            sharesFloat: capitalStructure.sharesFloat || (sharesOutstanding || 1000000) * 0.8,
            sharesInsiderOwned: capitalStructure.sharesInsiderOwned || (sharesOutstanding || 1000000) * 0.15,
            sharesInstitutionalOwned: capitalStructure.sharesInstitutionalOwned || (sharesOutstanding || 1000000) * 0.65,
            weightedAverageShares: capitalStructure.weightedAverageShares || sharesOutstanding || 1000000,
            stockOptions: capitalStructure.stockOptions || 0,
            restrictedStockUnits: capitalStructure.restrictedStockUnits || 0,
            performanceStockUnits: capitalStructure.performanceStockUnits || 0,
            convertibleDebt: {
              create: capitalStructure.convertibleDebt?.map((debt: any) => ({
                issueDate: new Date(debt.issueDate),
                maturityDate: new Date(debt.maturityDate),
                principal: debt.principal,
                interestRate: debt.interestRate,
                conversionPrice: debt.conversionPrice,
                conversionRatio: debt.conversionRatio,
                currentValue: debt.currentValue,
                isOutstanding: debt.isOutstanding,
                notes: debt.notes
              })) || []
            },
            warrants: {
              create: capitalStructure.warrants?.map((warrant: any) => ({
                issueDate: new Date(warrant.issueDate),
                expirationDate: new Date(warrant.expirationDate),
                strikePrice: warrant.strikePrice,
                sharesPerWarrant: warrant.sharesPerWarrant,
                totalWarrants: warrant.totalWarrants,
                isOutstanding: warrant.isOutstanding,
                notes: warrant.notes
              })) || []
            }
          }
        } : {
          create: {
            sharesBasic: sharesOutstanding || 1000000,
            sharesDilutedCurrent: sharesOutstanding || 1000000,
            sharesDilutedAssumed: sharesOutstanding || 1000000,
            sharesFloat: (sharesOutstanding || 1000000) * 0.8,
            sharesInsiderOwned: (sharesOutstanding || 1000000) * 0.15,
            sharesInstitutionalOwned: (sharesOutstanding || 1000000) * 0.65,
            weightedAverageShares: sharesOutstanding || 1000000,
            stockOptions: 0,
            restrictedStockUnits: 0,
            performanceStockUnits: 0
          }
        }
      },
      include: {
        treasuryHoldings: {
          include: {
            transactions: true
          }
        },
        executiveCompensation: true,
        capitalStructure: {
          include: {
            convertibleDebt: true,
            warrants: true
          }
        }
      }
    });

    // Transform response to match expected Company type
    const transformedCompany = {
      ticker: company.ticker,
      name: company.name,
      description: company.description || '',
      sector: company.sector,
      marketCap: company.marketCap,
      sharesOutstanding: company.sharesOutstanding,
      shareholdersEquity: company.shareholdersEquity,
      totalDebt: company.totalDebt,
      lastUpdated: company.lastUpdated.toISOString(),
      
      treasury: company.treasuryHoldings.map(holding => ({
        crypto: holding.crypto,
        amount: holding.amount,
        averageCostBasis: holding.averageCostBasis,
        totalCost: holding.totalCost,
        currentValue: holding.currentValue,
        unrealizedGain: holding.unrealizedGain,
        unrealizedGainPercent: holding.unrealizedGainPercent,
        transactions: holding.transactions.map(tx => ({
          id: tx.id,
          date: tx.date.toISOString(),
          amount: tx.amount,
          pricePerUnit: tx.pricePerUnit,
          totalCost: tx.totalCost,
          type: tx.type.toLowerCase() as 'purchase' | 'sale' | 'stake' | 'unstake',
          fundingMethod: tx.fundingMethod?.toLowerCase() as any,
          notes: tx.notes || undefined
        })),
        stakingYield: holding.stakingYield || undefined,
        stakedAmount: holding.stakedAmount || undefined
      })),
      
      businessModel: {
        revenueStreams: company.revenueStreams,
        operatingRevenue: company.operatingRevenue,
        operatingExpenses: company.operatingExpenses,
        cashBurnRate: company.cashBurnRate,
        isTreasuryFocused: company.isTreasuryFocused,
        legacyBusinessValue: company.legacyBusinessValue
      },
      
      governance: {
        boardSize: company.boardSize,
        independentDirectors: company.independentDirectors,
        ceoFounder: company.ceoFounder,
        votingRights: company.votingRights || '',
        auditFirm: company.auditFirm || ''
      },
      
      capitalStructure: company.capitalStructure ? {
        sharesBasic: company.capitalStructure.sharesBasic,
        sharesDilutedCurrent: company.capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: company.capitalStructure.sharesDilutedAssumed,
        sharesFloat: company.capitalStructure.sharesFloat,
        sharesInsiderOwned: company.capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: company.capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: company.capitalStructure.weightedAverageShares,
        stockOptions: company.capitalStructure.stockOptions,
        restrictedStockUnits: company.capitalStructure.restrictedStockUnits,
        performanceStockUnits: company.capitalStructure.performanceStockUnits,
        convertibleDebt: company.capitalStructure.convertibleDebt.map(debt => ({
          id: debt.id,
          issueDate: debt.issueDate.toISOString(),
          maturityDate: debt.maturityDate.toISOString(),
          principal: debt.principal,
          interestRate: debt.interestRate,
          conversionPrice: debt.conversionPrice,
          conversionRatio: debt.conversionRatio,
          currentValue: debt.currentValue,
          isOutstanding: debt.isOutstanding,
          notes: debt.notes || undefined
        })),
        warrants: company.capitalStructure.warrants.map(warrant => ({
          id: warrant.id,
          issueDate: warrant.issueDate.toISOString(),
          expirationDate: warrant.expirationDate.toISOString(),
          strikePrice: warrant.strikePrice,
          sharesPerWarrant: warrant.sharesPerWarrant,
          totalWarrants: warrant.totalWarrants,
          isOutstanding: warrant.isOutstanding,
          notes: warrant.notes || undefined
        }))
      } : {
        sharesBasic: capitalStructure.sharesBasic,
        sharesDilutedCurrent: capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: capitalStructure.sharesDilutedAssumed,
        sharesFloat: capitalStructure.sharesFloat,
        sharesInsiderOwned: capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: capitalStructure.weightedAverageShares,
        stockOptions: capitalStructure.stockOptions,
        restrictedStockUnits: capitalStructure.restrictedStockUnits,
        performanceStockUnits: capitalStructure.performanceStockUnits,
        convertibleDebt: [],
        warrants: []
      },
      
      executiveCompensation: company.executiveCompensation
    };

    // Invalidate relevant caches so the new company appears immediately on the home page
    const companiesCacheKey = CacheKeyGenerator.generateForQuery('company', 'findMany', { withTreasury: true });
    dbMonitor.queryCache.delete(companiesCacheKey);

    return NextResponse.json({ company: transformedCompany }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create company:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Company with this ticker already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}