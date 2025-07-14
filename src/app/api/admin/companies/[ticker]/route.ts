import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/admin/companies/[ticker] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const body = await request.json();
    
    const {
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

    // Validate required fields
    if (!name || !description || !sector) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { ticker },
      include: { capitalStructure: true }
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Update company
    const company = await prisma.company.update({
      where: { ticker },
      data: {
        name,
        description,
        sector,
        marketCap,
        sharesOutstanding,
        shareholdersEquity,
        totalDebt,
        // Business model fields
        revenueStreams: businessModel?.revenueStreams || [],
        operatingRevenue: businessModel?.operatingRevenue || 0,
        operatingExpenses: businessModel?.operatingExpenses || 0,
        cashBurnRate: businessModel?.cashBurnRate || 0,
        isTreasuryFocused: businessModel?.isTreasuryFocused || false,
        legacyBusinessValue: businessModel?.legacyBusinessValue || 0,
        // Governance fields
        boardSize: governance?.boardSize || 0,
        independentDirectors: governance?.independentDirectors || 0,
        ceoFounder: governance?.ceoFounder || false,
        votingRights: governance?.votingRights,
        auditFirm: governance?.auditFirm,
        lastUpdated: new Date()
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

    // Update or create capital structure
    if (capitalStructure) {
      if (existingCompany.capitalStructure) {
        await prisma.capitalStructure.update({
          where: { id: existingCompany.capitalStructure.id },
          data: {
            sharesBasic: capitalStructure.sharesBasic,
            sharesDilutedCurrent: capitalStructure.sharesDilutedCurrent,
            sharesDilutedAssumed: capitalStructure.sharesDilutedAssumed,
            sharesFloat: capitalStructure.sharesFloat,
            sharesInsiderOwned: capitalStructure.sharesInsiderOwned,
            sharesInstitutionalOwned: capitalStructure.sharesInstitutionalOwned,
            weightedAverageShares: capitalStructure.weightedAverageShares,
            stockOptions: capitalStructure.stockOptions,
            restrictedStockUnits: capitalStructure.restrictedStockUnits,
            performanceStockUnits: capitalStructure.performanceStockUnits
          }
        });
      } else {
        await prisma.capitalStructure.create({
          data: {
            companyId: company.id,
            sharesBasic: capitalStructure.sharesBasic,
            sharesDilutedCurrent: capitalStructure.sharesDilutedCurrent,
            sharesDilutedAssumed: capitalStructure.sharesDilutedAssumed,
            sharesFloat: capitalStructure.sharesFloat,
            sharesInsiderOwned: capitalStructure.sharesInsiderOwned,
            sharesInstitutionalOwned: capitalStructure.sharesInstitutionalOwned,
            weightedAverageShares: capitalStructure.weightedAverageShares,
            stockOptions: capitalStructure.stockOptions,
            restrictedStockUnits: capitalStructure.restrictedStockUnits,
            performanceStockUnits: capitalStructure.performanceStockUnits
          }
        });
      }
    }

    // Reload company with all relations
    const updatedCompany = await prisma.company.findUnique({
      where: { ticker },
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

    if (!updatedCompany) {
      throw new Error('Company not found after update');
    }

    // Transform response to match expected Company type
    const transformedCompany = {
      ticker: updatedCompany.ticker,
      name: updatedCompany.name,
      description: updatedCompany.description || '',
      sector: updatedCompany.sector,
      marketCap: updatedCompany.marketCap,
      sharesOutstanding: updatedCompany.sharesOutstanding,
      shareholdersEquity: updatedCompany.shareholdersEquity,
      totalDebt: updatedCompany.totalDebt,
      lastUpdated: updatedCompany.lastUpdated.toISOString(),
      
      treasury: updatedCompany.treasuryHoldings.map(holding => ({
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
        revenueStreams: updatedCompany.revenueStreams,
        operatingRevenue: updatedCompany.operatingRevenue,
        operatingExpenses: updatedCompany.operatingExpenses,
        cashBurnRate: updatedCompany.cashBurnRate,
        isTreasuryFocused: updatedCompany.isTreasuryFocused,
        legacyBusinessValue: updatedCompany.legacyBusinessValue
      },
      
      governance: {
        boardSize: updatedCompany.boardSize,
        independentDirectors: updatedCompany.independentDirectors,
        ceoFounder: updatedCompany.ceoFounder,
        votingRights: updatedCompany.votingRights || '',
        auditFirm: updatedCompany.auditFirm || ''
      },
      
      capitalStructure: updatedCompany.capitalStructure ? {
        sharesBasic: updatedCompany.capitalStructure.sharesBasic,
        sharesDilutedCurrent: updatedCompany.capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: updatedCompany.capitalStructure.sharesDilutedAssumed,
        sharesFloat: updatedCompany.capitalStructure.sharesFloat,
        sharesInsiderOwned: updatedCompany.capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: updatedCompany.capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: updatedCompany.capitalStructure.weightedAverageShares,
        stockOptions: updatedCompany.capitalStructure.stockOptions,
        restrictedStockUnits: updatedCompany.capitalStructure.restrictedStockUnits,
        performanceStockUnits: updatedCompany.capitalStructure.performanceStockUnits,
        convertibleDebt: updatedCompany.capitalStructure.convertibleDebt.map(debt => ({
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
        warrants: updatedCompany.capitalStructure.warrants.map(warrant => ({
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
        sharesBasic: updatedCompany.sharesOutstanding,
        sharesDilutedCurrent: updatedCompany.sharesOutstanding,
        sharesDilutedAssumed: updatedCompany.sharesOutstanding,
        sharesFloat: updatedCompany.sharesOutstanding,
        sharesInsiderOwned: 0,
        sharesInstitutionalOwned: 0,
        weightedAverageShares: updatedCompany.sharesOutstanding,
        stockOptions: 0,
        restrictedStockUnits: 0,
        performanceStockUnits: 0,
        convertibleDebt: [],
        warrants: []
      },
      
      executiveCompensation: updatedCompany.executiveCompensation
    };

    return NextResponse.json({ company: transformedCompany });
  } catch (error) {
    console.error('Failed to update company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/companies/[ticker] - Delete company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { ticker }
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Delete company (cascades to related data)
    await prisma.company.delete({
      where: { ticker }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}