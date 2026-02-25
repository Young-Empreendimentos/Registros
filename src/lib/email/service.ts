import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  await transporter.sendMail({
    from: `"Young Empreendimentos" <${process.env.EMAIL_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendBoletoITBIEmail(params: {
  loteNumero: string;
  clienteNome: string;
  empreendimento: string;
  boletoUrl: string;
}): Promise<void> {
  const { loteNumero, clienteNome, empreendimento, boletoUrl } = params;

  await sendEmail({
    to: 'lais@youngempreendimentos.com.br',
    subject: `Boleto ITBI - Lote ${loteNumero} - ${empreendimento}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff5a1f;">Boleto ITBI para Pagamento</h2>
        <p><strong>Lote:</strong> ${loteNumero}</p>
        <p><strong>Cliente:</strong> ${clienteNome}</p>
        <p><strong>Empreendimento:</strong> ${empreendimento}</p>
        <p><strong>Documento:</strong> <a href="${boletoUrl}" style="color: #ff5a1f;">Clique aqui para baixar</a></p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Young Empreendimentos - Sistema de Controle de Registros</p>
      </div>
    `,
  });
}

export async function sendOPRegistroEmail(params: {
  loteNumero: string;
  clienteNome: string;
  empreendimento: string;
  opUrl: string;
}): Promise<void> {
  const { loteNumero, clienteNome, empreendimento, opUrl } = params;

  await sendEmail({
    to: 'lais@youngempreendimentos.com.br',
    subject: `OP Registro - Lote ${loteNumero} - ${empreendimento}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff5a1f;">OP de Registro</h2>
        <p><strong>Lote:</strong> ${loteNumero}</p>
        <p><strong>Cliente:</strong> ${clienteNome}</p>
        <p><strong>Empreendimento:</strong> ${empreendimento}</p>
        <p><strong>Documento:</strong> <a href="${opUrl}" style="color: #ff5a1f;">Clique aqui para baixar</a></p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Young Empreendimentos - Sistema de Controle de Registros</p>
      </div>
    `,
  });
}

export async function sendMatriculaEmail(params: {
  clienteNome: string;
  clienteEmail: string;
  loteNumero: string;
  empreendimento: string;
  matriculaUrl: string;
}): Promise<void> {
  const { clienteNome, clienteEmail, loteNumero, empreendimento, matriculaUrl } = params;

  await sendEmail({
    to: clienteEmail,
    subject: `Seu lote ${loteNumero} em ${empreendimento} foi registrado!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Prezado(a), <strong>${clienteNome}</strong></p>
        <p>É com imenso prazer que informo a você que seu lote <strong>${loteNumero}</strong> em <strong>${empreendimento}</strong> foi registrado!</p>
        <p>Em anexo está a sua matrícula averbada digitalizada.</p>
        <p><a href="${matriculaUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff5a1f; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Ver Matrícula Averbada</a></p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Young Empreendimentos</p>
      </div>
    `,
  });
}
