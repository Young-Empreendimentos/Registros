import { NextRequest, NextResponse } from 'next/server';
import { exchangeAndVerify, getGoogleConfig, GOOGLE_STATE_COOKIE } from '@/lib/google';
import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { notificarGestoresNovaSolicitacao } from '@/lib/email/solicitacao-acesso';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  // Validação anti-CSRF: o state da volta tem que bater com o cookie.
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirect('/login?erro=google_state');
  }

  let identity;
  try {
    identity = await exchangeAndVerify(code);
  } catch (error) {
    console.error('Google callback error:', error);
    return redirect('/login?erro=google');
  }

  // Trava de domínio: só e-mails verificados do domínio permitido.
  const { allowedDomain } = getGoogleConfig();
  if (!identity.emailVerified || !identity.email.endsWith(`@${allowedDomain}`)) {
    return redirect('/login?erro=dominio');
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from(T.usuarios)
    .select('id, nome, email, role, ativo, aprovado')
    .eq('email', identity.email)
    .maybeSingle();

  // Não cadastrado → cria SOLICITAÇÃO pendente e NÃO emite sessão.
  if (!user) {
    const { data: novo, error } = await supabase
      .from(T.usuarios)
      .insert({
        nome: identity.name || identity.email,
        email: identity.email,
        senha_hash: null,
        role: 'leitor',
        ativo: false,
        aprovado: false,
        auth_provider: 'google',
      })
      .select('id, nome, email')
      .single();

    if (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
      return redirect('/login?erro=solicitacao');
    }

    // Aviso aos gestores (best-effort — não bloqueia o fluxo se o e-mail falhar).
    try {
      await notificarGestoresNovaSolicitacao({ nome: novo.nome, email: novo.email });
    } catch (err) {
      console.error('Falha ao notificar gestores da nova solicitação:', err);
    }

    return redirect('/login?status=solicitado');
  }

  // Cadastrado mas ainda não aprovado → aguardando (sem sessão).
  if (!user.aprovado) {
    return redirect('/login?status=pendente');
  }

  // Aprovado, porém desativado.
  if (!user.ativo) {
    return redirect('/login?erro=desativado');
  }

  // Tudo certo → emite o MESMO cookie JWT do login por senha.
  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    nome: user.nome,
  });

  const response = redirect('/registros');
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
