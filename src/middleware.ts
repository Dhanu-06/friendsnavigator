import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthCookie = request.cookies.has('firebaseIdToken');

  // If user is trying to access login page but is already authenticated, redirect to dashboard
  if (pathname === '/login' && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is trying to access a protected dashboard route without authentication, redirect to login
  if (pathname.startsWith('/dashboard') && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
