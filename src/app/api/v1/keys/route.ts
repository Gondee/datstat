import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '@/api/utils/response';
import { authenticate } from '@/api/middleware/auth';
import crypto from 'crypto';

// GET /api/v1/keys - List user's API keys
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user, error } = await authenticate(req, { requireAuth: true });
  
  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        scopes: true,
        rateLimit: true,
        active: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
      },
    });

    // Mask API keys for security
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`,
      createdAt: key.createdAt.toISOString(),
      lastUsed: key.lastUsed?.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
    }));

    return ApiResponseBuilder.success(maskedKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return ApiResponseBuilder.internalError('Failed to fetch API keys');
  }
}

// POST /api/v1/keys - Create new API key
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user, error } = await authenticate(req, { requireAuth: true });
  
  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  const body = await req.json();
  const { name, scopes = ['read'], expiresIn } = body;

  if (!name) {
    return ApiResponseBuilder.badRequest('API key name is required');
  }

  try {
    // Check API key limit
    const keyCount = await prisma.apiKey.count({
      where: { userId: user.id, active: true },
    });

    const keyLimit = user.role === 'admin' ? 50 : 10;
    if (keyCount >= keyLimit) {
      return ApiResponseBuilder.badRequest(`API key limit reached (${keyLimit} keys)`);
    }

    // Generate secure API key
    const apiKey = `tap_${crypto.randomBytes(32).toString('hex')}`;

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    // Determine rate limit based on user tier
    const rateLimit = user.tier === 'enterprise' ? 5000 
      : user.tier === 'pro' ? 1000 
      : user.tier === 'basic' ? 300 
      : 60;

    const newKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        key: apiKey,
        scopes,
        rateLimit,
        active: true,
        expiresAt,
      },
    });

    return ApiResponseBuilder.success({
      id: newKey.id,
      name: newKey.name,
      key: apiKey, // Return full key only on creation
      scopes: newKey.scopes,
      rateLimit: newKey.rateLimit,
      active: newKey.active,
      createdAt: newKey.createdAt.toISOString(),
      expiresAt: newKey.expiresAt?.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return ApiResponseBuilder.internalError('Failed to create API key');
  }
}

