import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';
import { sendEmail } from '@/lib/email/service';
import { getAppPublicUrl } from '@/lib/app-url';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Avisa todos os gestores ativos que há uma nova solicitação de acesso via Google. */
export async function notificarGestoresNovaSolicitacao(solicitante: {
  nome: string;
  email: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { data: gestores } = await supabase
    .from(T.usuarios)
    .select('email')
    .eq('role', 'gestor')
    .eq('ativo', true)
    .eq('aprovado', true);

  const destinatarios = (gestores || [])
    .map((g) => g.email as string)
    .filter(Boolean);

  if (destinatarios.length === 0) return;

  const configUrl = `${getAppPublicUrl()}/configuracoes`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #ff5a1f;">Nova solicitação de acesso</h2>
      <p>Uma pessoa tentou entrar com o Google e precisa de aprovação para acessar o Controle de Registros:</p>
      <div style="background: #fff8f5; border: 1px solid #ffd4c2; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Nome:</strong> ${escapeHtml(solicitante.nome)}</p>
        <p style="margin: 8px 0;"><strong>E-mail:</strong> ${escapeHtml(solicitante.email)}</p>
      </div>
      <p>
        <a href="${configUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff5a1f; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Revisar em Configurações → Usuários</a>
      </p>
      <p style="color: #666; font-size: 14px;">Enquanto não for aprovada, essa pessoa não tem acesso a nenhuma tela do sistema.</p>
      <hr style="border: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px;">Young Empreendimentos — Controle de Registros</p>
    </div>
  `;

  for (const to of destinatarios) {
    await sendEmail({
      to,
      subject: 'Nova solicitação de acesso — Controle de Registros',
      html,
    });
  }
}
