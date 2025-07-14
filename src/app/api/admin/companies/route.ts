import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/companies - List all companies
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
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

    // Validate required fields
    if (!ticker || !name || !description || !sector) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        description,
        sector,
        marketCap,
        sharesOutstanding,
        shareholdersEquity,
        totalDebt,
        // Business model fields are directly on Company model
        revenueStreams: businessModel?.revenueStreams || [],
        operatingRevenue: businessModel?.operatingRevenue || 0,
        operatingExpenses: businessModel?.operatingExpenses || 0,
        cashBurnRate: businessModel?.cashBurnRate || 0,
        isTreasuryFocused: businessModel?.isTreasuryFocused || false,
        legacyBusinessValue: businessModel?.legacyBusinessValue || 0,
        // Governance fields are directly on Company model  
        boardSize: governance?.boardSize || 0,
        independentDirectors: governance?.independentDirectors || 0,
        ceoFounder: governance?.ceoFounder || false,
        votingRights: governance?.votingRights,
        auditFirm: governance?.auditFirm,
        capitalStructure: {
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
            performanceStockUnits: capitalStructure.performanceStockUnits,
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

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error('Failed to create company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}