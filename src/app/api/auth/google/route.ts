import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl, GOOGLE_STATE_COOKIE } from '@/lib/google';

/** Inicia o login com Google: gera o state anti-CSRF e redireciona ao consentimento. */
export async function GET(request: NextRequest) {
  try {
    const state = crypto.randomUUID();
    const response = NextResponse.redirect(buildGoogleAuthUrl(state));
    response.cookies.set(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 min para concluir o fluxo
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Google auth start error:', error);
    return NextResponse.redirect(new URL('/login?erro=google_config', request.url));
  }
}
