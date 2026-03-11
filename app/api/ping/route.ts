/**
 * GET /api/ping
 * Endpoint ultra-ligero para verificar conectividad real con internet.
 * Responde en <100ms desde Vercel. Usado por checkRealConnectivity().
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
