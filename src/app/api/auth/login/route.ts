import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'E-mail e senha são obrigatórios' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('ativo', true)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Credenciais inválidas' },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.senha_hash);
  if (!valid) {
    return NextResponse.json(
      { error: 'Credenciais inválidas' },
      { status: 401 }
    );
  }

  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    nome: user.nome,
  });

  const response = NextResponse.json({
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
