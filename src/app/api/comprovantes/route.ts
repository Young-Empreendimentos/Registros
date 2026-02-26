import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Empreendimentos permitidos (sienge_id -> nome):
// 1    - Parque da Guarda Residence
// 2    - Jardim do Parque
// 2003 - Montecarlo
// 2004 - Ilha dos Açores
// 2005 - Aurora
// 2007 - Parque Lorena l
// 2009 - Parque Lorena ll
// 2010 - Erico Verissimo
// 2011 - Algarve
// 2014 - Morada da Coxilha
const ALLOWED_ENTERPRISE_IDS = new Set([1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014]);

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [{ data: compData }, { data: lotesData }, { data: empsData }, { data: regsData }] = await Promise.all([
    supabase.from('comprovantes').select('*').order('created_at', { ascending: false }),
    supabase.from('lotes').select('*'),
    supabase.from('empreendimentos').select('*'),
    supabase.from('registros').select('id, lote_id'),
  ]);

  const allowedEmps = (empsData || []).filter((e: { sienge_id: number }) => 
    ALLOWED_ENTERPRISE_IDS.has(e.sienge_id)
  );
  const allowedEmpIds = new Set(allowedEmps.map((e: { id: string }) => e.id));

  const empMap = new Map(allowedEmps.map((e: { id: string; nome: string }) => [e.id, e.nome]));
  
  const allowedLotes = (lotesData || []).filter((l: { empreendimento_id: string }) => 
    allowedEmpIds.has(l.empreendimento_id)
  );
  const allowedLoteIds = new Set(allowedLotes.map((l: { id: string }) => l.id));
  
  const loteMap = new Map(allowedLotes.map((l: { id: string; numero: string; empreendimento_id: string }) => [l.id, l]));
  const regMap = new Map((regsData || []).map((r: { id: string; lote_id: string }) => [r.lote_id, r.id]));

  const enrichedComprovantes = (compData || [])
    .filter((c: { lote_id: string }) => allowedLoteIds.has(c.lote_id))
    .map((c: { id: string; url: string; descricao: string | null; created_at: string; lote_id: string; registro_id: string; uploaded_by: string }) => {
      const lote = loteMap.get(c.lote_id) as { numero: string; empreendimento_id: string } | undefined;
      return {
        ...c,
        lote_numero: lote?.numero || 'N/A',
        empreendimento_nome: lote ? (empMap.get(lote.empreendimento_id) || 'N/A') : 'N/A',
      };
    });

  const loteOptions = allowedLotes
    .map((l: { id: string; numero: string; empreendimento_id: string }) => ({
      id: l.id,
      numero: l.numero,
      empreendimento: empMap.get(l.empreendimento_id) || 'N/A',
      registro_id: regMap.get(l.id) || '',
    }))
    .filter((l: { registro_id: string }) => l.registro_id)
    .sort((a: { empreendimento: string; numero: string }, b: { empreendimento: string; numero: string }) => {
      const empCmp = a.empreendimento.localeCompare(b.empreendimento);
      if (empCmp !== 0) return empCmp;
      return a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true });
    });

  return NextResponse.json({ comprovantes: enrichedComprovantes, lotes: loteOptions });
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { lote_id, registro_id, url, descricao } = body;

  if (!lote_id || !registro_id || !url) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('comprovantes').insert({
    registro_id,
    lote_id,
    url,
    descricao: descricao || null,
    uploaded_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
