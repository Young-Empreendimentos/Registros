import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { T } from '@/lib/supabase/tables';

const UPDATABLE_FIELDS = new Set([
  'data_solicitacao_itbi',
  'valor_itbi',
  'boleto_itbi_url',
  'comprovante_itbi_url',
  'op_registro_url',
  'nf_registro_url',
  'matricula_url',
  'impugnado',
  'data_recolhimento_itbi',
  'data_entrega_ri',
  'data_recebimento_ri',
  'segurar_registro',
  'responsabilidade_cliente',
  'financiamento_caixa',
  'observacoes',
  'etapa_analise',
  'andamento',
  'data_gatilho',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  if (user.role === 'leitor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (UPDATABLE_FIELDS.has(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(T.registros)
    .update(updates)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Registro não encontrado ou não atualizado' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
