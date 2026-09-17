import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isProductionHost(host: string) {
  const h = String(host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
  return h === 'vcdekho.com' || h === 'www.vcdekho.com';
}

export default function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  if (!isProductionHost(host)) {
    return NextResponse.next();
  }

  const isSensitiveData =
    pathname.startsWith('/utils/_data/') ||
    pathname.startsWith('/data/') ||
    pathname === '/utils/_data' ||
    pathname === '/VC Dekho Sheet - Investor - Individuals.csv';
  if (isSensitiveData) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/utils/_data/:path*',
    '/data/:path*',
    '/VC Dekho Sheet - Investor - Individuals.csv'
  ]
};
