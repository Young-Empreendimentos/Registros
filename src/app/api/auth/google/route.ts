import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl, GOOGLE_STATE_COOKIE } from '@/lib/google';
import { getAppPublicUrl } from '@/lib/app-url';

/** Inicia o login com Google: gera o state anti-CSRF e redireciona ao consentimento. */
export async function GET() {
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
    // Base pública (atrás do proxy do Railway, request.url aponta para o host interno).
    return NextResponse.redirect(`${getAppPublicUrl()}/login?erro=google_config`);
  }
}
