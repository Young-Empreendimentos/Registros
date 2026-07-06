import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

function extrairNumeroLote(input: string | undefined | null): string {
  if (!input) return '';
  const match = input.match(/\d+/);
  if (!match) return '';
  return String(parseInt(match[0], 10));
}

interface TIParcela {
  cost_center_id: number;
  cost_center_name: string;
  units: Array<{ name: string }>;
  total_paid_net: number;
}

async function main() {
  console.log('=== Validação cobertura V2 (com normalização correta) ===\n');

  // Carregar TODAS parcelas por empreendimento
  const allParcelas: TIParcela[] = [];
  const empreendimentosIds = [1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014];
  
  for (const empId of empreendimentosIds) {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data } = await supabaseTI
        .from('sienge_parcelas_receber')
        .select('cost_center_id, cost_center_name, units, total_paid_net')
        .eq('cost_center_id', empId)
        .range(offset, offset + 999);

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allParcelas.push(...(data as TIParcela[]));
        offset += 1000;
        if (data.length < 1000) hasMore = false;
      }
    }
  }
  console.log(`Total parcelas carregadas: ${allParcelas.length}`);

  // Agrupar por empreendimento + número do lote
  const lotesTI = new Map<string, { totalPago: number; parcelas: number; ccName: string; unitNameOriginal: string }>();
  for (const p of allParcelas) {
    const unitName = p.units?.[0]?.name;
    if (!unitName) continue;
    const numLote = extrairNumeroLote(unitName);
    if (!numLote) continue;
    
    const key = `${p.cost_center_id}|${numLote}`;
    if (!lotesTI.has(key)) {
      lotesTI.set(key, { totalPago: 0, parcelas: 0, ccName: p.cost_center_name, unitNameOriginal: unitName });
    }
    const info = lotesTI.get(key)!;
    info.totalPago += p.total_paid_net || 0;
    info.parcelas++;
  }
  
  console.log(`Lotes únicos no TI (normalizados): ${lotesTI.size}\n`);

  // Buscar TODOS os contratos do nosso banco (paginação)
  const todosContratos = [];
  let cOffset = 0;
  let cHasMore = true;
  while (cHasMore) {
    const { data } = await supabase
      .from('contratos')
      .select(`
        id, numero_contrato, valor_ja_pago,
        lotes(numero, empreendimentos(sienge_id, nome))
      `)
      .eq('ativo', true)
      .range(cOffset, cOffset + 999);
    
    if (!data || data.length === 0) {
      cHasMore = false;
    } else {
      todosContratos.push(...data);
      cOffset += 1000;
      if (data.length < 1000) cHasMore = false;
    }
  }
  
  console.log(`Contratos ativos no nosso banco: ${todosContratos.length}\n`);

  // Match
  let matches = 0;
  let semMatch = 0;
  const semMatchPorEmp = new Map<string, number>();
  const matchPorEmp = new Map<string, number>();

  for (const contrato of todosContratos) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;

    const enterpriseId = lote.empreendimentos.sienge_id;
    const empName = lote.empreendimentos.nome;
    
    // Tenta ambos os candidatos (igual a função real)
    const candidatos = [contrato.numero_contrato, lote.numero];
    const numeros = new Set<string>();
    for (const c of candidatos) {
      const n = extrairNumeroLote(c);
      if (n) numeros.add(n);
    }
    
    let achou = false;
    for (const num of numeros) {
      if (lotesTI.has(`${enterpriseId}|${num}`)) {
        achou = true;
        break;
      }
    }
    
    if (achou) {
      matches++;
      matchPorEmp.set(empName, (matchPorEmp.get(empName) || 0) + 1);
    } else {
      semMatch++;
      semMatchPorEmp.set(empName, (semMatchPorEmp.get(empName) || 0) + 1);
    }
  }

  console.log(`✓ Contratos COM match no TI: ${matches}`);
  console.log(`✗ Contratos SEM match no TI: ${semMatch}\n`);

  console.log('Match por empreendimento:');
  const allEmps = new Set([...matchPorEmp.keys(), ...semMatchPorEmp.keys()]);
  for (const emp of [...allEmps].sort()) {
    const m = matchPorEmp.get(emp) || 0;
    const sm = semMatchPorEmp.get(emp) || 0;
    const total = m + sm;
    const pct = total > 0 ? ((m / total) * 100).toFixed(1) : '0';
    console.log(`  ${emp.padEnd(28)}: ${m}/${total} (${pct}%)`);
  }

  // Mostrar exemplos de contratos sem match
  if (semMatchPorEmp.size > 0) {
    console.log('\n\nExemplos de contratos SEM match:');
    let count = 0;
    for (const contrato of todosContratos) {
      if (count >= 10) break;
      const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
      if (!lote?.empreendimentos) continue;
      const numContrato = contrato.numero_contrato || lote.numero;
      const numLote = extrairNumeroLote(numContrato);
      const key = `${lote.empreendimentos.sienge_id}|${numLote}`;
      if (!lotesTI.has(key)) {
        console.log(`  ${lote.empreendimentos.nome} | numero_contrato: "${contrato.numero_contrato}" | lote.numero: "${lote.numero}" | extraído: "${numLote}"`);
        count++;
      }
    }
  }
}

main().catch(console.error);
