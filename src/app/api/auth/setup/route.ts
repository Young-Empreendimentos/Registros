import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ needsSetup: (count || 0) === 0 });
}

export async function POST(request: Request) {
  const supabase = createServiceClient();

  const { count } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true });

  if ((count || 0) > 0) {
    return NextResponse.json(
      { error: 'Sistema já configurado' },
      { status: 400 }
    );
  }

  const { nome, email, password } = await request.json();

  if (!nome || !email || !password) {
    return NextResponse.json(
      { error: 'Nome, e-mail e senha são obrigatórios' },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Senha deve ter no mínimo 6 caracteres' },
      { status: 400 }
    );
  }

  const senhaHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('usuarios')
    .insert({
      nome,
      email: email.toLowerCase().trim(),
      senha_hash: senhaHash,
      role: 'gestor',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
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
