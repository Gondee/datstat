import { NextRequest } from 'next/server';
import { updateApiKey, deleteApiKey } from '../handlers';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return updateApiKey(req, resolvedParams);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return deleteApiKey(req, resolvedParams);
}