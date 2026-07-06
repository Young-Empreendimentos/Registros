import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Checagem preguiçosa (em runtime): sem valor padrão embutido.
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não definida — configure uma variável de ambiente forte.');
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = 'auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isAuthCallback = pathname === '/auth/callback';
  const isApiAuth = pathname.startsWith('/api/auth/');
  const isApiSync = pathname === '/api/sync';
  if (isApiAuth || isApiSync || isAuthCallback) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
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
