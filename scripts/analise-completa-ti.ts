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

interface TIParcela {
  cost_center_id: number;
  cost_center_name: string;
  units: Array<{ name: string }>;
  total_paid_net: number;
}

async function main() {
  console.log('=== Análise completa do banco TI ===\n');

  console.log('Carregando TODAS as parcelas por empreendimento...');
  const allParcelas: TIParcela[] = [];
  
  // Empreendimentos conhecidos
  const empreendimentosIds = [1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014];
  
  for (const empId of empreendimentosIds) {
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    let totalEmp = 0;
    
    while (hasMore) {
      const { data, error } = await supabaseTI
        .from('sienge_parcelas_receber')
        .select('cost_center_id, cost_center_name, units, total_paid_net')
        .eq('cost_center_id', empId)
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`  Erro emp ${empId}:`, error.message);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allParcelas.push(...(data as TIParcela[]));
        totalEmp += data.length;
        offset += pageSize;
        if (data.length < pageSize) hasMore = false;
      }
    }
    
    if (totalEmp > 0) {
      console.log(`  Empreendimento ${empId}: ${totalEmp} parcelas`);
    }
  }

  console.log(`\nTotal carregado: ${allParcelas.length}\n`);

  // Agrupar lotes únicos por empreendimento (cost_center_id + unit name)
  const lotesUnicos = new Map<string, { totalPago: number; parcelas: number; ccName: string }>();
  for (const p of allParcelas) {
    const unitName = p.units?.[0]?.name;
    if (!unitName || unitName === 'N/A') continue;
    
    const key = `${p.cost_center_id}|${unitName}`;
    if (!lotesUnicos.has(key)) {
      lotesUnicos.set(key, { totalPago: 0, parcelas: 0, ccName: p.cost_center_name });
    }
    const info = lotesUnicos.get(key)!;
    info.totalPago += p.total_paid_net || 0;
    info.parcelas++;
  }

  console.log(`Lotes únicos no TI: ${lotesUnicos.size}`);

  // Agora buscar todos os contratos ativos do nosso banco
  const { data: contratos } = await supabase
    .from('contratos')
    .select(`
      id, numero_contrato, valor_ja_pago,
      lotes(numero, empreendimentos(sienge_id, nome))
    `)
    .eq('ativo', true);

  console.log(`Contratos ativos no nosso banco: ${contratos?.length || 0}\n`);

  // Verificar match
  let matches = 0;
  let semMatch = 0;
  const semMatchPorEmpreendimento = new Map<string, number>();

  for (const contrato of contratos || []) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;

    const enterpriseId = lote.empreendimentos.sienge_id;
    const numContrato = contrato.numero_contrato || lote.numero;
    const normalizedLote = numContrato.replace(/^(CT\.|ADT\.|NF\.)/i, '').replace(/[A-Z]$/i, '').trim();
    
    const key1 = `${enterpriseId}|${normalizedLote}`;
    const key2 = `${enterpriseId}|${numContrato}`;
    
    if (lotesUnicos.has(key1) || lotesUnicos.has(key2)) {
      matches++;
    } else {
      semMatch++;
      const empName = lote.empreendimentos.nome;
      semMatchPorEmpreendimento.set(empName, (semMatchPorEmpreendimento.get(empName) || 0) + 1);
    }
  }

  console.log(`Contratos COM match no TI: ${matches}`);
  console.log(`Contratos SEM match no TI: ${semMatch}\n`);

  console.log('Contratos SEM match por empreendimento:');
  for (const [emp, count] of [...semMatchPorEmpreendimento.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${emp}: ${count}`);
  }

  // Mostrar quantos lotes do TI por empreendimento
  console.log('\nLotes únicos no TI por empreendimento:');
  const tiPorEmp = new Map<string, number>();
  for (const [, info] of lotesUnicos) {
    tiPorEmp.set(info.ccName, (tiPorEmp.get(info.ccName) || 0) + 1);
  }
  for (const [emp, count] of [...tiPorEmp.entries()].sort()) {
    console.log(`  ${emp}: ${count}`);
  }
}

main().catch(console.error);
