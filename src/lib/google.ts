import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getAppPublicUrl } from '@/lib/app-url';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

export const GOOGLE_STATE_COOKIE = 'google_oauth_state';

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados');
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${getAppPublicUrl()}/api/auth/google/callback`,
    allowedDomain: process.env.GOOGLE_ALLOWED_DOMAIN || 'youngempreendimentos.com.br',
  };
}

/** Monta a URL de consentimento do Google. `state` protege contra CSRF. */
export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri, allowedDomain } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
    // Dica de domínio para o Google. NÃO é garantia — o domínio é validado no callback.
    hd: allowedDomain,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  name: string;
  hd?: string;
}

/** Troca o `code` por tokens e verifica o id_token contra as chaves do Google. */
export async function exchangeAndVerify(code: string): Promise<GoogleIdentity> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token error ${res.status}: ${detail}`);
  }

  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) {
    throw new Error('Google não retornou id_token');
  }

  const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  return {
    email: String(payload.email || '').toLowerCase().trim(),
    emailVerified: payload.email_verified === true,
    name: String(payload.name || payload.email || ''),
    hd: typeof payload.hd === 'string' ? payload.hd : undefined,
  };
}
