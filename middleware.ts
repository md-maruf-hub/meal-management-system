import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Token check from cookie
  const token = request.cookies.get('mill_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin route check
  if (pathname.startsWith('/dashboard/admin') && user.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: ['/dashboard/:path*', '/reports/:path*', '/api/:path*'],
};
