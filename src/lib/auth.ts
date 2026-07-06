import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// Checagem preguiçosa (em runtime): sem valor padrão embutido. Sem JWT_SECRET,
// falha ao assinar/verificar em vez de usar um segredo público conhecido.
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não definida — configure uma variável de ambiente forte.');
  }
  return new TextEncoder().encode(secret);
}

export const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  nome: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
