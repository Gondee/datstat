import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '@/api/utils/response';
import { authenticate } from '@/api/middleware/auth';

// PUT /api/v1/keys/:id - Update API key
export async function updateApiKey(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const { user, error } = await authenticate(req, { requireAuth: true });
  
  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  const body = await req.json();
  const { name, scopes, active } = body;

  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return ApiResponseBuilder.notFound('API key');
    }

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data: {
        name: name || apiKey.name,
        scopes: scopes || apiKey.scopes,
        active: active !== undefined ? active : apiKey.active,
      },
    });

    return ApiResponseBuilder.success({
      id: updated.id,
      name: updated.name,
      scopes: updated.scopes,
      active: updated.active,
      lastUsed: updated.lastUsed?.toISOString(),
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return ApiResponseBuilder.internalError('Failed to update API key');
  }
}

// DELETE /api/v1/keys/:id - Delete API key
export async function deleteApiKey(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const { user, error } = await authenticate(req, { requireAuth: true });
  
  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return ApiResponseBuilder.notFound('API key');
    }

    await prisma.apiKey.delete({
      where: { id: params.id },
    });

    return ApiResponseBuilder.success({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return ApiResponseBuilder.internalError('Failed to delete API key');
  }
}