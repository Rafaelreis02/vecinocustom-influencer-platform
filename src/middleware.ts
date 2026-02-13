import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes - always allow
        if (
          pathname === '/' || 
          pathname === '/login' || 
          pathname.startsWith('/api/auth') ||  // NextAuth endpoints
          pathname.startsWith('/api/portal') || // Portal public routes
          pathname.includes('/api/auth/callback') // Explicitamente permitir callbacks
        ) {
          return true;
        }

        // Protected routes - require token
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

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
