import { NextRequest, NextResponse } from 'next/server';
import { apiRouter } from '@/api/gateway/router';
import { v1Routes } from '@/api/v1/routes';
import { initializeAPI } from '@/api';

// Initialize API on first request
let apiInitialized = false;

async function ensureAPIInitialized() {
  if (!apiInitialized) {
    await initializeAPI();
    apiInitialized = true;
    
    // Register all v1 routes
    v1Routes.forEach(route => apiRouter.register(route));
  }
}

// Handle all HTTP methods
export async function GET(req: NextRequest) {
  await ensureAPIInitialized();
  return apiRouter.handle(req);
}

export async function POST(req: NextRequest) {
  await ensureAPIInitialized();
  return apiRouter.handle(req);
}

export async function PUT(req: NextRequest) {
  await ensureAPIInitialized();
  return apiRouter.handle(req);
}

export async function DELETE(req: NextRequest) {
  await ensureAPIInitialized();
  return apiRouter.handle(req);
}

export async function PATCH(req: NextRequest) {
  await ensureAPIInitialized();
  return apiRouter.handle(req);
}

export async function OPTIONS(req: NextRequest) {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}