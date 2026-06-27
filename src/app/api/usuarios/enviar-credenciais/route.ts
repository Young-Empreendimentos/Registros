import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';
import { sendUsuarioCredenciaisEmail } from '@/lib/email/credenciais-usuario';
import type { UserRole } from '@/types';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'gestor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { usuarioId, password, tipo = 'lembrete' } = await request.json();

  if (!usuarioId) {
    return NextResponse.json({ error: 'usuarioId é obrigatório' }, { status: 400 });
  }

  if (password !== undefined && password !== '' && password.length < 6) {
    return NextResponse.json(
      { error: 'Senha deve ter no mínimo 6 caracteres' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: usuario, error } = await supabase
    .from(T.usuarios)
    .select('id, nome, email, role, ativo')
    .eq('id', usuarioId)
    .single();

  if (error || !usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  if (!usuario.ativo) {
    return NextResponse.json(
      { error: 'Usuário inativo — ative antes de enviar credenciais' },
      { status: 400 }
    );
  }

  if (password) {
    const { error: pwdError } = await supabase
      .from(T.usuarios)
      .update({ senha_hash: await hashPassword(password) })
      .eq('id', usuarioId);
    if (pwdError) {
      return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 });
    }
  }

  try {
    await sendUsuarioCredenciaisEmail({
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role as UserRole,
      password: password || undefined,
      tipo: tipo === 'novo' ? 'novo' : 'lembrete',
    });
  } catch (err) {
    console.error('Erro ao enviar credenciais:', err);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail. Verifique a configuração do Resend no servidor.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `E-mail enviado para ${usuario.email}`,
  });
}
