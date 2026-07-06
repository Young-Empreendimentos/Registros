/**
 * Sincroniza andamento ↔ observações e reaplica textos canônicos (print Antonio).
 * Uso: npm exec tsx scripts/sync-andamento-canonico.ts [--dry-run]
 */

import { createRegistrosClient, T, R } from './lib/supabase-registros';

const ANDAMENTOS: Array<{ empreendimento: string; lote: string; andamento: string }> = [
  { empreendimento: 'Ilha dos Açores', lote: '320', andamento: 'Aguardar até segunda ordem' },
  { empreendimento: 'Ilha dos Açores', lote: '58', andamento: 'Reprotocolado' },
  {
    empreendimento: 'Montecarlo',
    lote: '183',
    andamento:
      'Impugnado. Coletar assinatura do cliente, reconhecer e reprotocolar. Cliente não está retornando mensagens e ligações. Pedi ajuda da Andreice para chamar etc.',
  },
  { empreendimento: 'Erico Verissimo', lote: '70', andamento: 'Reprotocolado' },
  {
    empreendimento: 'Aurora',
    lote: '5',
    andamento: 'Estou verificando onde este contrato está com a Caroline, pois não chegou ainda',
  },
  { empreendimento: 'Erico Verissimo', lote: '255', andamento: 'Reprotocolado' },
  {
    empreendimento: 'Erico Verissimo',
    lote: '69',
    andamento: 'Impugnado. Voltou dos correios de Cruz Alta pois não receberam o pedido. Iremos reenviar',
  },
  { empreendimento: 'Ilha dos Açores', lote: '264', andamento: 'Reprotocolado' },
  { empreendimento: 'Ilha dos Açores', lote: '32', andamento: 'Reprotocolado' },
  {
    empreendimento: 'Erico Verissimo',
    lote: '250',
    andamento: 'Estamos coletando as assinaturas, reconhecer e protocolar.',
  },
  { empreendimento: 'Aurora', lote: '99', andamento: 'Protocolado' },
  {
    empreendimento: 'Erico Verissimo',
    lote: '205',
    andamento: 'Estamos coletando as assinaturas, reconhecer e protocolar.',
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const supabase = createRegistrosClient();

  const { data: rows, error } = await supabase
    .from(T.registros)
    .select('id, andamento, observacoes');

  if (error) throw error;

  let synced = 0;
  for (const row of rows || []) {
    const a = (row.andamento || '').trim();
    const o = (row.observacoes || '').trim();
    if (!a && !o) continue;
    const canonical = a || o;
    if (a === canonical && o === canonical) continue;

    if (dryRun) {
      console.log(`[sync] ${row.id}: observacoes="${o.slice(0, 40)}" → "${canonical.slice(0, 40)}"`);
    } else {
      const { error: updErr } = await supabase
        .from(T.registros)
        .update({ andamento: canonical, observacoes: canonical })
        .eq('id', row.id);
      if (updErr) throw updErr;
    }
    synced++;
  }

  console.log(`\n${synced} registro(s) sincronizado(s) (andamento ↔ observações)`);

  let applied = 0;
  for (const item of ANDAMENTOS) {
    const { data: lotes, error: findErr } = await supabase
      .from(T.lotes)
      .select(`id, ${R.empreendimentos}!inner(nome)`)
      .ilike(`${R.empreendimentos}.nome`, `${item.empreendimento.trim()}%`)
      .eq('numero', item.lote);

    if (findErr) throw findErr;
    const lote = lotes?.[0];
    if (!lote) {
      console.warn(`Lote não encontrado: ${item.empreendimento} ${item.lote}`);
      continue;
    }

    const { data: registro } = await supabase
      .from(T.registros)
      .select('id')
      .eq('lote_id', lote.id)
      .maybeSingle();

    if (!registro) {
      console.warn(`Registro não encontrado: ${item.empreendimento} ${item.lote}`);
      continue;
    }

    if (dryRun) {
      console.log(`[canon] ${item.empreendimento} ${item.lote}`);
    } else {
      const { error: updErr } = await supabase
        .from(T.registros)
        .update({ andamento: item.andamento, observacoes: item.andamento })
        .eq('id', registro.id);
      if (updErr) throw updErr;
    }
    applied++;
  }

  console.log(`${applied} andamento(s) canônico(s) aplicado(s)`);
  if (dryRun) console.log('(dry-run — nada gravado)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
