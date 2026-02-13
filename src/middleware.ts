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
          pathname.startsWith('/api/auth')
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
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
