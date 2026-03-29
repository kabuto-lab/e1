import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backendBase(): string {
  const u =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.API_PROXY_UPSTREAM?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_URL?.trim() ||
    'http://127.0.0.1:3000';
  return u.replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const auth = request.headers.get('authorization');
  const contentType = request.headers.get('content-type') || 'application/json';

  const res = await fetch(`${backendBase()}/reviews/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
  });

  const out = new NextResponse(await res.arrayBuffer(), { status: res.status });
  const ct = res.headers.get('content-type');
  if (ct) out.headers.set('content-type', ct);
  return out;
}
