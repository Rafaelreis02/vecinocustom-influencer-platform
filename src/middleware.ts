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
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/portal') ||  // Portal API is public (uses token in URL)
          pathname.startsWith('/portal')         // Portal pages are public
        ) {
          return true;
        }

        // Protected routes - require authentication
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
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
