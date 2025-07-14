import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { validateQueryParams } from '../middleware/validation';
import { companyQuerySchema, createCompanySchema } from '../middleware/validation';
import { hasPermission } from '../middleware/auth';

// GET /api/v1/companies
export async function getCompanies(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const { data: query, error } = validateQueryParams(searchParams, companyQuerySchema);

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const where: any = {};

    if (query?.sector) {
      where.sector = query.sector;
    }

    if (query?.minMarketCap !== undefined) {
      where.marketCap = { ...where.marketCap, gte: query.minMarketCap };
    }

    if (query?.maxMarketCap !== undefined) {
      where.marketCap = { ...where.marketCap, lte: query.maxMarketCap };
    }

    if (query?.hasTreasury !== undefined) {
      where.treasuryHoldings = query.hasTreasury ? { some: {} } : { none: {} };
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { ticker: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip: ((query?.page || 1) - 1) * (query?.limit || 20),
        take: query?.limit || 20,
        orderBy: query?.sort
          ? { [query.sort]: query.order || 'asc' }
          : { marketCap: 'desc' },
        include: {
          treasury: true,
          marketData: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return ApiResponseBuilder.paginated(companies, {
      page: query?.page || 1,
      limit: query?.limit || 20,
      total,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return ApiResponseBuilder.internalError('Failed to fetch companies');
  }
}

// GET /api/v1/companies/:ticker
export async function getCompany(
  req: NextRequest,
  params: { ticker: string }
): Promise<NextResponse> {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: params.ticker.toUpperCase() },
      include: {
        treasury: {
          include: {
            transactions: {
              orderBy: { date: 'desc' },
            },
          },
        },
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        capitalStructure: {
          include: {
            convertibleDebt: true,
            warrants: true,
          },
        },
        executiveCompensation: {
          orderBy: { year: 'desc' },
          take: 5,
        },
      },
    });

    if (!company) {
      return ApiResponseBuilder.notFound('Company');
    }

    // Calculate metrics
    const metrics = await calculateCompanyMetrics(company);

    return ApiResponseBuilder.success({
      ...company,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return ApiResponseBuilder.internalError('Failed to fetch company');
  }
}

// POST /api/v1/companies (Admin only)
export async function createCompany(req: NextRequest): Promise<NextResponse> {
  const user = (req as any).user;
  
  if (!user || !hasPermission(user, 'admin')) {
    return ApiResponseBuilder.forbidden('Admin access required');
  }

  const { data: body, error } = await validateRequest(req, createCompanySchema);
  
  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const company = await prisma.company.create({
      data: {
        ...body!,
        lastUpdated: new Date(),
      },
    });

    // Audit log
    await auditLog('company.create', 'company', company.ticker, body, {
      id: user.id,
      type: 'user',
    });

    return ApiResponseBuilder.success(company, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return ApiResponseBuilder.badRequest('Company already exists');
    }
    console.error('Error creating company:', error);
    return ApiResponseBuilder.internalError('Failed to create company');
  }
}

// PUT /api/v1/companies/:ticker (Admin only)
export async function updateCompany(
  req: NextRequest,
  params: { ticker: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  
  if (!user || !hasPermission(user, 'admin')) {
    return ApiResponseBuilder.forbidden('Admin access required');
  }

  const body = await req.json();

  try {
    const company = await prisma.company.update({
      where: { ticker: params.ticker.toUpperCase() },
      data: {
        ...body,
        lastUpdated: new Date(),
      },
    });

    // Audit log
    await auditLog('company.update', 'company', company.ticker, body, {
      id: user.id,
      type: 'user',
    });

    return ApiResponseBuilder.success(company);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return ApiResponseBuilder.notFound('Company');
    }
    console.error('Error updating company:', error);
    return ApiResponseBuilder.internalError('Failed to update company');
  }
}

// DELETE /api/v1/companies/:ticker (Admin only)
export async function deleteCompany(
  req: NextRequest,
  params: { ticker: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  
  if (!user || !hasPermission(user, 'admin')) {
    return ApiResponseBuilder.forbidden('Admin access required');
  }

  try {
    await prisma.company.delete({
      where: { ticker: params.ticker.toUpperCase() },
    });

    // Audit log
    await auditLog('company.delete', 'company', params.ticker, null, {
      id: user.id,
      type: 'user',
    });

    return ApiResponseBuilder.success({ message: 'Company deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return ApiResponseBuilder.notFound('Company');
    }
    console.error('Error deleting company:', error);
    return ApiResponseBuilder.internalError('Failed to delete company');
  }
}

// Helper functions
async function calculateCompanyMetrics(company: any) {
  // Get latest crypto prices
  const cryptoPrices = await prisma.cryptoPrice.findMany({
    where: {
      symbol: { in: ['BTC', 'ETH', 'SOL'] },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['symbol'],
  });

  const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

  // Calculate treasury value
  let treasuryValue = 0;
  const treasuryConcentration: Record<string, number> = {};

  company.treasuryHoldings?.forEach((holding: any) => {
    const currentPrice = priceMap.get(holding.crypto) || 0;
    const value = holding.amount * currentPrice;
    treasuryValue += value;
    treasuryConcentration[holding.crypto] = value;
  });

  // Calculate per-share metrics
  const treasuryValuePerShare = treasuryValue / company.sharesOutstanding;
  const navPerShare = (company.shareholdersEquity + treasuryValue - company.totalDebt) / company.sharesOutstanding;
  const stockPrice = company.marketData?.[0]?.price || 0;
  const premiumToNav = stockPrice - navPerShare;
  const premiumToNavPercent = navPerShare > 0 ? (premiumToNav / navPerShare) * 100 : 0;

  // Calculate concentration percentages
  Object.keys(treasuryConcentration).forEach(key => {
    treasuryConcentration[key] = treasuryValue > 0
      ? (treasuryConcentration[key] / treasuryValue) * 100
      : 0;
  });

  return {
    ticker: company.ticker,
    treasuryValue,
    treasuryValuePerShare,
    navPerShare,
    stockPrice,
    premiumToNav,
    premiumToNavPercent,
    debtToTreasuryRatio: treasuryValue > 0 ? company.totalDebt / treasuryValue : 0,
    treasuryConcentration,
  };
}

// Import from logging middleware
import { auditLog } from '../middleware/logging';
import { validateRequest } from '../middleware/validation';