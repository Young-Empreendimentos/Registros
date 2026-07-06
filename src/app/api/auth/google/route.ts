import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';
import { signToken, COOKIE_NAME } from '@/lib/auth';

const ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN || 'youngempreendimentos.com.br';

/**
 * Ponte Supabase Auth → sessão própria.
 * O cliente faz o login Google via Supabase e envia o access_token aqui.
 * Validamos o token, o domínio e a lista (registros_usuarios), e emitimos
 * o MESMO cookie JWT do login por senha. Retorna { redirect } para o cliente.
 */
export async function POST(request: Request) {
  let accessToken: string | undefined;
  try {
    ({ accessToken } = await request.json());
  } catch {
    accessToken = undefined;
  }

  if (!accessToken) {
    return NextResponse.json({ redirect: '/login?erro=google' }, { status: 400 });
  }

  // Valida o token do Supabase e extrai a identidade do Google.
  const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  const supaUser = userData?.user;

  if (userError || !supaUser?.email) {
    return NextResponse.json({ redirect: '/login?erro=google' }, { status: 401 });
  }

  const email = supaUser.email.toLowerCase().trim();
  const emailVerificado =
    supaUser.email_confirmed_at != null ||
    supaUser.user_metadata?.email_verified === true;

  // Trava de domínio.
  if (!emailVerificado || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.json({ redirect: '/login?erro=dominio' });
  }

  const nome =
    (supaUser.user_metadata?.full_name as string) ||
    (supaUser.user_metadata?.name as string) ||
    email;

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from(T.usuarios)
    .select('id, nome, email, role, ativo, aprovado')
    .eq('email', email)
    .maybeSingle();

  // Não cadastrado → cria SOLICITAÇÃO pendente e NÃO emite sessão.
  if (!user) {
    const { error } = await supabase.from(T.usuarios).insert({
      nome,
      email,
      senha_hash: null,
      role: 'leitor',
      ativo: false,
      aprovado: false,
      auth_provider: 'google',
    });

    if (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
      return NextResponse.json({ redirect: '/login?erro=solicitacao' }, { status: 500 });
    }

    // Sem e-mail de aviso: gestores veem as solicitações pendentes na página principal.
    return NextResponse.json({ redirect: '/login?status=solicitado' });
  }

  // Cadastrado mas ainda não aprovado → aguardando (sem sessão).
  if (!user.aprovado) {
    return NextResponse.json({ redirect: '/login?status=pendente' });
  }

  // Aprovado, porém desativado.
  if (!user.ativo) {
    return NextResponse.json({ redirect: '/login?erro=desativado' });
  }

  // Tudo certo → emite o MESMO cookie JWT do login por senha.
  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    nome: user.nome,
  });

  const response = NextResponse.json({ redirect: '/registros' });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
