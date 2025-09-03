import { NextResponse } from 'next/server';
import { verifyAuth } from './lib/auth';

export async function middleware(request) {
  // Get token from cookie
  const token = request.cookies.get('token')?.value;

  // Verify authentication
  const verifiedToken = token && await verifyAuth(token).catch(err => {
    console.error('Token verification failed:', err);
  });

  // Protected routes
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !verifiedToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Auth routes (login/register)
  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && verifiedToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register']
};