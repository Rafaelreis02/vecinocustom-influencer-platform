import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple auth middleware - protect dashboard and API routes
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (allow without auth)
  const publicRoutes = [
    '/',
    '/login',
    '/api/portal', // Portal routes are public (use token auth)
  ];

  const isPublic = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublic) {
    return NextResponse.next();
  }

  // For now, allow all requests (TODO: implement proper auth)
  // Once NextAuth is set up, check for session here
  
  // Example with NextAuth:
  // const token = request.cookies.get('next-auth.session-token');
  // if (!token && pathname.startsWith('/dashboard')) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
