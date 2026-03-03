import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computarRegistroCompleto } from '@/lib/calculations';
import type { Empreendimento, Lote, Contrato, Registro } from '@/types';

// Empreendimentos permitidos (sienge_id -> nome):
// 1    - Parque da Guarda Residence
// 2    - Jardim do Parque
// 2003 - Montecarlo
// 2004 - Ilha dos Açores
// 2005 - Aurora
// 2007 - Parque Lorena l
// 2009 - Parque Lorena II
// 2010 - Erico Verissimo
// 2011 - Algarve
// 2014 - Morada da Coxilha
const ALLOWED_ENTERPRISE_IDS = new Set([1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014]);

async function fetchAll<T>(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  filter?: { column: string; value: unknown }
): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (filter) {
      query = query.eq(filter.column, filter.value);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      all.push(...(data as T[]));
      hasMore = data.length === pageSize;
      from += pageSize;
    }
  }

  return all;
}

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

  const [empreendimentos, lotes, contratos, registros] = await Promise.all([
    fetchAll<Empreendimento>(supabase, 'empreendimentos'),
    fetchAll<Lote>(supabase, 'lotes'),
    fetchAll<Contrato>(supabase, 'contratos', { column: 'ativo', value: true }),
    fetchAll<Registro>(supabase, 'registros'),
  ]);

  const allowedEmps = empreendimentos.filter((e) => ALLOWED_ENTERPRISE_IDS.has(e.sienge_id));
  const allowedEmpIds = new Set(allowedEmps.map((e) => e.id));

  const empMap = new Map<string, Empreendimento>();
  allowedEmps.forEach((e) => empMap.set(e.id, e));

  const contratoByLote = new Map<string, Contrato>();
  contratos.forEach((c) => {
    if (c.ativo) contratoByLote.set(c.lote_id, c);
  });

  const loteMap = new Map<string, Lote>();
  lotes.forEach((l) => {
    if (allowedEmpIds.has(l.empreendimento_id)) {
      loteMap.set(l.id, l);
    }
  });

  const computed = registros
    .map((registro) => {
      const lote = loteMap.get(registro.lote_id);
      if (!lote) return null;
      const emp = empMap.get(lote.empreendimento_id);
      if (!emp) return null;
      const contrato = contratoByLote.get(lote.id) || null;
      return computarRegistroCompleto(registro, lote, emp, contrato);
    })
    .filter(Boolean);

  return NextResponse.json({ registros: computed });
}
