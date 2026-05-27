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
  console.log('=== Verificando cobertura do banco TI ===\n');

  // 1. Buscar todos os lotes com units no banco TI
  const { data: tiData } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('cost_center_id, cost_center_name, units, total_paid_net')
    .gt('total_paid_net', 0)
    .limit(10000);

  // Mapear lotes únicos do TI
  const lotesTI = new Map<string, number>();
  for (const p of tiData || []) {
    const unitName = p.units?.[0]?.name;
    if (unitName && unitName !== 'N/A') {
      const key = `${p.cost_center_id}|${unitName}`;
      lotesTI.set(key, (lotesTI.get(key) || 0) + (p.total_paid_net || 0));
    }
  }

  console.log(`Lotes únicos no TI (com pagamentos): ${lotesTI.size}`);

  // 2. Buscar contratos ativos no nosso banco
  const { data: contratos } = await supabase
    .from('contratos')
    .select(`
      id, numero_contrato, valor_ja_pago,
      lotes(numero, empreendimentos(sienge_id, nome))
    `)
    .eq('ativo', true);

  console.log(`Contratos ativos no nosso banco: ${contratos?.length || 0}`);

  // 3. Verificar quais contratos existem em ambos
  let matches = 0;
  const resultados: Array<{
    empreendimento: string;
    lote: string;
    valorBanco: number;
    valorTI: number;
  }> = [];

  for (const contrato of contratos || []) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;

    const enterpriseId = lote.empreendimentos.sienge_id;
    const loteNumero = (contrato.numero_contrato || lote.numero).replace(/[A-Z]$/i, '');
    const key = `${enterpriseId}|${loteNumero}`;

    if (lotesTI.has(key)) {
      matches++;
      resultados.push({
        empreendimento: lote.empreendimentos.nome,
        lote: lote.numero,
        valorBanco: contrato.valor_ja_pago || 0,
        valorTI: lotesTI.get(key)!,
      });
    }
  }

  console.log(`\nContratos com correspondência no TI: ${matches}`);

  if (resultados.length > 0) {
    console.log('\n=== Comparação de valores ===\n');
    console.log('Empreendimento\t\t| Lote\t| Banco\t\t| TI\t\t| Diff');
    console.log('----------------------------------------------------------------------');
    for (const r of resultados) {
      const diff = r.valorTI - r.valorBanco;
      const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
      console.log(
        `${r.empreendimento.substring(0, 16).padEnd(16)}\t| ${r.lote}\t| ${r.valorBanco.toFixed(2).padStart(10)}\t| ${r.valorTI.toFixed(2).padStart(10)}\t| ${diffStr}`
      );
    }
  }

  // 4. Resumo por empreendimento
  console.log('\n\n=== Resumo por empreendimento ===\n');
  
  const empreendimentosTI = new Map<string, number>();
  for (const p of tiData || []) {
    const name = p.cost_center_name;
    empreendimentosTI.set(name, (empreendimentosTI.get(name) || 0) + 1);
  }

  for (const [name, count] of [...empreendimentosTI.entries()].sort()) {
    console.log(`${name}: ${count} parcelas com pagamento`);
  }
}

main().catch(console.error);
