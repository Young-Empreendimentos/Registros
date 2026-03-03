import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'young-registros-jwt-secret-change-in-production'
);

const COOKIE_NAME = 'auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isApiAuth = pathname.startsWith('/api/auth/');
  const isApiSync = pathname === '/api/sync';
  const isApiSyncLogs = pathname === '/api/sync-logs';
  const isApiUpdateValores = pathname === '/api/update-valores';
  const isApiUpdateContrato = pathname === '/api/update-contrato';

  if (isApiAuth || isApiSync || isApiSyncLogs || isApiUpdateValores || isApiUpdateContrato) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      // token inválido ou expirado
    }
  }

  if (!isAuthenticated && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/registros';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-young.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
