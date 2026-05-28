import { getAppPublicUrl } from '@/lib/app-url';
import { sendEmail } from '@/lib/email/service';
import type { UserRole } from '@/types';

const ROLE_LABELS: Record<UserRole, string> = {
  gestor: 'Gestor',
  operador: 'Operador',
  leitor: 'Leitor',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCredenciaisHtml(params: {
  nome: string;
  email: string;
  role: UserRole;
  loginUrl: string;
  password?: string;
  tipo: 'novo' | 'lembrete';
}): string {
  const { nome, email, role, loginUrl, password, tipo } = params;
  const titulo =
    tipo === 'novo'
      ? 'Acesso ao Controle de Registros'
      : 'Lembrete — Controle de Registros';
  const intro =
    tipo === 'novo'
      ? 'Sua conta foi criada no sistema da Young Empreendimentos. Use os dados abaixo para entrar:'
      : 'Segue um lembrete dos seus dados de acesso ao sistema:';

  const senhaBlock = password
    ? `<p><strong>Senha:</strong> <code style="background:#fff3ed;padding:4px 8px;border-radius:4px;">${escapeHtml(password)}</code></p>`
    : `<p style="color:#666;font-size:14px;">Use a senha que você recebeu no cadastro. Se não lembrar, peça ao gestor para redefinir em <strong>Configurações → Usuários</strong> e enviar um novo lembrete com senha.</p>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #ff5a1f; margin-bottom: 8px;">${titulo}</h2>
      <p>Olá, <strong>${escapeHtml(nome)}</strong>!</p>
      <p>${intro}</p>
      <div style="background: #fff8f5; border: 1px solid #ffd4c2; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Plataforma:</strong> <a href="${loginUrl}" style="color: #ff5a1f;">${escapeHtml(loginUrl)}</a></p>
        <p style="margin: 8px 0;"><strong>E-mail (login):</strong> ${escapeHtml(email)}</p>
        ${senhaBlock}
        <p style="margin: 8px 0;"><strong>Perfil:</strong> ${escapeHtml(ROLE_LABELS[role])}</p>
      </div>
      <p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff5a1f; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Acessar o sistema</a>
      </p>
      <hr style="border: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">Young Empreendimentos — Controle de Registros<br/>Não compartilhe sua senha com terceiros.</p>
    </div>
  `;
}

export async function sendUsuarioCredenciaisEmail(params: {
  nome: string;
  email: string;
  role: UserRole;
  password?: string;
  tipo: 'novo' | 'lembrete';
}): Promise<void> {
  const loginUrl = `${getAppPublicUrl()}/login`;
  const subject =
    params.tipo === 'novo'
      ? 'Seu acesso ao Controle de Registros — Young Empreendimentos'
      : 'Lembrete de acesso — Controle de Registros';

  await sendEmail({
    to: params.email,
    subject,
    html: buildCredenciaisHtml({
      ...params,
      loginUrl,
    }),
  });
}
