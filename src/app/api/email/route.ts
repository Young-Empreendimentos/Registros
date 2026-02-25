import { NextRequest, NextResponse } from 'next/server';
import { sendBoletoITBIEmail, sendOPRegistroEmail, sendMatriculaEmail } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    switch (type) {
      case 'boleto_itbi':
        await sendBoletoITBIEmail({
          loteNumero: body.loteNumero,
          clienteNome: body.clienteNome,
          empreendimento: body.empreendimento,
          boletoUrl: body.url,
        });
        return NextResponse.json({ success: true, message: 'E-mail de boleto ITBI enviado' });

      case 'op_registro':
        await sendOPRegistroEmail({
          loteNumero: body.loteNumero,
          clienteNome: body.clienteNome,
          empreendimento: body.empreendimento,
          opUrl: body.url,
        });
        return NextResponse.json({ success: true, message: 'E-mail de OP registro enviado' });

      case 'matricula':
        await sendMatriculaEmail({
          clienteNome: body.clienteNome,
          clienteEmail: body.clienteEmail,
          loteNumero: body.loteNumero,
          empreendimento: body.empreendimento,
          matriculaUrl: body.url,
        });
        return NextResponse.json({ success: true, message: 'E-mail de matrícula enviado' });

      default:
        return NextResponse.json({ error: 'Tipo de e-mail inválido' }, { status: 400 });
    }
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail' },
      { status: 500 }
    );
  }
}
