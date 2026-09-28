import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/lib/i18n/routing';
import { normalizeWorkspaceId } from '@/components/market-performance/workspace-identity';

const localeMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isDashboardRoot = pathname === '/' || routing.locales.some(locale => pathname === `/${locale}` || pathname === `/${locale}/`);
  const requestedWorkspace = searchParams.get('workspace');
  if (requestedWorkspace) {
    const workspace = normalizeWorkspaceId(requestedWorkspace);
    if (workspace !== requestedWorkspace) {
      const url = request.nextUrl.clone();
      url.searchParams.set('workspace', workspace);
      return NextResponse.redirect(url);
    }
  }
  if (isDashboardRoot && !searchParams.has('workspace') && !searchParams.has('view')) {
    const url = request.nextUrl.clone();
    url.searchParams.set('workspace', 'home');
    return NextResponse.redirect(url);
  }
  return localeMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(cn|en)/:path*',
    '/((?!api|llms|sitemap|r|_next/static|_next/image|_next/.*|images|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)'
  ],
};
