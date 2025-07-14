import { NextRequest } from 'next/server';
import { updateApiKey, deleteApiKey } from '../route';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return updateApiKey(req, params);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return deleteApiKey(req, params);
}