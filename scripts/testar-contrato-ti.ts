import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Carregar .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const supabaseTI = createClient(
  process.env.SUPABASE_TI_URL!,
  process.env.SUPABASE_TI_SERVICE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Teste: Buscar contrato Algarve lote 36 ===\n');

  // Primeiro verificar se existe o lote 36 do Algarve no nosso banco
  const { data: contrato } = await supabase
    .from('contratos')
    .select(`
      id, numero_contrato, valor_ja_pago, valor_total,
      lotes(numero, empreendimentos(sienge_id, nome))
    `)
    .eq('ativo', true)
    .limit(1000);

  // Filtrar para encontrar Algarve lote 36
  const algarve36 = contrato?.find(c => {
    const lote = c.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    return lote?.empreendimentos?.sienge_id === 2011 && lote?.numero === '36';
  });

  if (algarve36) {
    const lote = algarve36.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } };
    console.log('Contrato encontrado no nosso banco:');
    console.log(`  Lote: ${lote.numero} (${lote.empreendimentos.nome})`);
    console.log(`  Valor Total: R$ ${algarve36.valor_total?.toLocaleString('pt-BR')}`);
    console.log(`  Valor já pago (banco): R$ ${(algarve36.valor_ja_pago || 0).toLocaleString('pt-BR')}`);
  } else {
    console.log('Contrato Algarve 36 não encontrado no nosso banco.');
    console.log('Vou listar contratos disponíveis do Algarve...');
    
    const algarveContratos = contrato?.filter(c => {
      const lote = c.lotes as { numero: string; empreendimentos: { sienge_id: number } } | null;
      return lote?.empreendimentos?.sienge_id === 2011;
    }) || [];
    
    for (const c of algarveContratos.slice(0, 5)) {
      const lote = c.lotes as { numero: string };
      console.log(`  Lote ${lote.numero}: R$ ${(c.valor_ja_pago || 0).toLocaleString('pt-BR')}`);
    }
  }

  // Buscar dados do TI para Algarve lote 36
  console.log('\n\nDados do banco TI para Algarve (2011):');
  const { data: tiData } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('document_number, units, total_paid_net, installment_number')
    .eq('cost_center_id', 2011)
    .limit(100);

  // Agrupar por lote
  const porLote = new Map<string, { parcelas: number; total: number }>();
  for (const p of tiData || []) {
    const unitName = p.units?.[0]?.name || 'N/A';
    if (!porLote.has(unitName)) {
      porLote.set(unitName, { parcelas: 0, total: 0 });
    }
    const info = porLote.get(unitName)!;
    info.parcelas++;
    info.total += p.total_paid_net || 0;
  }

  console.log('Lotes com dados no TI:');
  for (const [lote, info] of [...porLote.entries()].sort()) {
    console.log(`  Lote ${lote}: ${info.parcelas} parcelas, R$ ${info.total.toLocaleString('pt-BR')}`);
  }
}

main().catch(console.error);
