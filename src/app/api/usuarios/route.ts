import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'gestor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo, created_at')
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }

  return NextResponse.json({ usuarios: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'gestor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { nome, email, password, role } = await request.json();

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

  const validRoles = ['gestor', 'operador', 'leitor'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const senhaHash = await hashPassword(password);

  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nome,
      email: email.toLowerCase().trim(),
      senha_hash: senhaHash,
      role,
    })
    .select('id, nome, email, role, ativo, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }

  return NextResponse.json({ usuario: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'gestor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id, nome, email, role, ativo, password } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (email !== undefined) updates.email = email.toLowerCase().trim();
  if (role !== undefined) {
    const validRoles = ['gestor', 'operador', 'leitor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
    }
    updates.role = role;
  }
  if (ativo !== undefined) updates.ativo = ativo;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }
    updates.senha_hash = await hashPassword(password);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('id, nome, email, role, ativo, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }

  return NextResponse.json({ usuario: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'gestor') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: 'Não é possível excluir seu próprio usuário' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('usuarios').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
