/**
 * Atualiza campo andamento (aba Análise) conforme print Tabela_1.
 * Uso: npx tsx scripts/atualizar-andamento-analise-print.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRegistrosClient, R, T } from './lib/supabase-registros';

const ANDAMENTOS: Array<{ empreendimento: string; lote: string; andamento: string }> = [
  {
    empreendimento: 'Ilha dos Açores',
    lote: '320',
    andamento: 'Aguardar até segunda ordem',
  },
  {
    empreendimento: 'Ilha dos Açores',
    lote: '58',
    andamento: 'Reprotocolado',
  },
  {
    empreendimento: 'Montecarlo',
    lote: '183',
    andamento:
      'Impugnado. Coletar assinatura do cliente, reconhecer e reprotocolar. Cliente não está retornando mensagens e ligações. Pedi ajuda da Andreice para chamar etc.',
  },
  {
    empreendimento: 'Erico Verissimo',
    lote: '70',
    andamento: 'Reprotocolado',
  },
  {
    empreendimento: 'Aurora',
    lote: '5',
    andamento:
      'Estou verificando onde este contrato está com a Caroline, pois não chegou ainda',
  },
  {
    empreendimento: 'Erico Verissimo',
    lote: '255',
    andamento: 'Reprotocolado',
  },
  {
    empreendimento: 'Erico Verissimo',
    lote: '69',
    andamento:
      'Impugnado. Voltou dos correios de Cruz Alta pois não receberam o pedido. Iremos reenviar',
  },
  {
    empreendimento: 'Ilha dos Açores',
    lote: '264',
    andamento: 'Reprotocolado',
  },
  {
    empreendimento: 'Ilha dos Açores',
    lote: '32',
    andamento: 'Reprotocolado',
  },
  {
    empreendimento: 'Erico Verissimo',
    lote: '250',
    andamento: 'Estamos coletando as assinaturas, reconhecer e protocolar.',
  },
  {
    empreendimento: 'Aurora',
    lote: '99',
    andamento: 'Protocolado',
  },
  {
    empreendimento: 'Erico Verissimo',
    lote: '205',
    andamento: 'Estamos coletando as assinaturas, reconhecer e protocolar.',
  },
];

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadEnv();

  const supabase = createRegistrosClient();

  let ok = 0;
  let fail = 0;

  for (const item of ANDAMENTOS) {
    const { data: rows, error: findErr } = await supabase
      .from(T.lotes)
      .select(`id, ${R.empreendimentos}!inner(nome)`)
      .ilike(`${R.empreendimentos}.nome`, `${item.empreendimento.trim()}%`)
      .eq('numero', item.lote);

    if (findErr) {
      console.error(`Erro busca ${item.empreendimento} ${item.lote}:`, findErr.message);
      fail++;
      continue;
    }

    const lote = rows?.[0];
    if (!lote) {
      console.warn(`Não encontrado: ${item.empreendimento} lote ${item.lote}`);
      fail++;
      continue;
    }

    const { data: registro, error: regErr } = await supabase
      .from(T.registros)
      .select('id')
      .eq('lote_id', lote.id)
      .maybeSingle();

    if (regErr || !registro) {
      console.warn(`Sem registro: ${item.empreendimento} lote ${item.lote}`);
      fail++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${item.empreendimento} ${item.lote}: ${item.andamento.slice(0, 60)}...`);
      ok++;
      continue;
    }

    // andamento (aba Análise); observacoes como fallback se coluna ainda não existir
    let updErr = (
      await supabase
        .from(T.registros)
        .update({ andamento: item.andamento, observacoes: item.andamento })
        .eq('id', registro.id)
    ).error;

    if (updErr?.message?.includes('andamento')) {
      updErr = (
        await supabase
          .from(T.registros)
          .update({ observacoes: item.andamento })
          .eq('id', registro.id)
      ).error;
    }

    if (updErr) {
      console.error(`Erro update ${item.empreendimento} ${item.lote}:`, updErr.message);
      fail++;
    } else {
      console.log(`OK: ${item.empreendimento} lote ${item.lote}`);
      ok++;
    }
  }

  console.log(`\n=== ${ok} atualizado(s), ${fail} falha(s) ===`);
  if (dryRun) console.log('(dry-run — nada gravado)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
