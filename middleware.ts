// Language switching without URL changes
// We handle language switching through React Context, not URL routing

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // No-op middleware - language switching is handled client-side
  // Just pass through the request
  return NextResponse.next();
}

export const config = {
  // Match all routes except API and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
