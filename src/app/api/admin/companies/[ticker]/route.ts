import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/companies/[ticker] - Get specific company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    const company = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
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
        },
      }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Failed to fetch company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

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

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() }
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = await prisma.company.update({
      where: { ticker: ticker.toUpperCase() },
      data: {
        name,
        description,
        sector,
        marketCap,
        sharesOutstanding,
        shareholdersEquity,
        totalDebt,
        // Business model fields are directly on Company model
        revenueStreams: businessModel?.revenueStreams,
        operatingRevenue: businessModel?.operatingRevenue,
        operatingExpenses: businessModel?.operatingExpenses,
        cashBurnRate: businessModel?.cashBurnRate,
        isTreasuryFocused: businessModel?.isTreasuryFocused,
        legacyBusinessValue: businessModel?.legacyBusinessValue,
        // Governance fields are directly on Company model
        boardSize: governance?.boardSize,
        independentDirectors: governance?.independentDirectors,
        ceoFounder: governance?.ceoFounder,
        votingRights: governance?.votingRights,
        auditFirm: governance?.auditFirm,
        capitalStructure: capitalStructure ? {
          upsert: {
            create: {
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
            },
            update: {
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
          }
        } : undefined
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
        },
      }
    });

    return NextResponse.json({ company });
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
      where: { ticker: ticker.toUpperCase() }
    });

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Delete company and all related data (cascade delete)
    await prisma.company.delete({
      where: { ticker: ticker.toUpperCase() }
    });

    return NextResponse.json(
      { message: 'Company deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}