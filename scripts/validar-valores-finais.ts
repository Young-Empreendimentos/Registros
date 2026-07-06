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
  units: Array<{ name: string }>;
  total_paid_net: number;
}

async function main() {
  console.log('=== Validação final ===\n');

  // 1. Carregar dados do TI
  const allParcelas: TIParcela[] = [];
  const empreendimentosIds = [1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014];
  
  for (const empId of empreendimentosIds) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabaseTI
        .from('sienge_parcelas_receber')
        .select('cost_center_id, units, total_paid_net')
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
  
  // Agrupar por empreendimento + lote
  const valoresTI = new Map<string, number>();
  for (const p of allParcelas) {
    const numLote = extrairNumeroLote(p.units?.[0]?.name);
    if (!numLote) continue;
    const key = `${p.cost_center_id}|${numLote}`;
    valoresTI.set(key, (valoresTI.get(key) || 0) + (p.total_paid_net || 0));
  }
  
  console.log(`Lotes únicos no TI: ${valoresTI.size}\n`);

  // 2. Buscar todos os contratos do nosso banco
  const contratos = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from('contratos')
      .select(`
        id, numero_contrato, valor_ja_pago,
        lotes(numero, empreendimentos(sienge_id, nome))
      `)
      .eq('ativo', true)
      .range(offset, offset + 999);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      contratos.push(...data);
      offset += 1000;
      if (data.length < 1000) hasMore = false;
    }
  }
  
  console.log(`Contratos ativos no nosso banco: ${contratos.length}\n`);

  // 3. Comparar
  let iguais = 0;
  let diferentes = 0;
  let diferentesGrandes = 0; // diferença > R$ 10
  let semDadosTI = 0;
  const exemplosDiferentes: Array<{ empName: string; lote: string; banco: number; ti: number; diff: number }> = [];

  for (const contrato of contratos) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;
    
    const enterpriseId = lote.empreendimentos.sienge_id;
    const candidatos = [contrato.numero_contrato, lote.numero];
    const numeros = new Set<string>();
    for (const c of candidatos) {
      const n = extrairNumeroLote(c);
      if (n) numeros.add(n);
    }
    
    let valorTI = 0;
    let achouNoTI = false;
    for (const num of numeros) {
      const v = valoresTI.get(`${enterpriseId}|${num}`);
      if (v !== undefined) {
        valorTI = v;
        achouNoTI = true;
        break;
      }
    }
    
    if (!achouNoTI) {
      semDadosTI++;
      continue;
    }
    
    const valorBanco = contrato.valor_ja_pago || 0;
    const diff = Math.abs(valorBanco - valorTI);
    
    if (diff < 0.01) {
      iguais++;
    } else {
      diferentes++;
      if (diff > 10) {
        diferentesGrandes++;
        if (exemplosDiferentes.length < 20) {
          exemplosDiferentes.push({
            empName: lote.empreendimentos.nome,
            lote: contrato.numero_contrato || lote.numero,
            banco: valorBanco,
            ti: valorTI,
            diff: valorTI - valorBanco,
          });
        }
      }
    }
  }

  console.log(`✓ Contratos com valor IGUAL ao TI: ${iguais}`);
  console.log(`~ Contratos com diferença pequena (<R$ 10): ${diferentes - diferentesGrandes}`);
  console.log(`✗ Contratos com diferença grande (>R$ 10): ${diferentesGrandes}`);
  console.log(`? Contratos sem dados no TI: ${semDadosTI}`);
  
  if (exemplosDiferentes.length > 0) {
    console.log('\nExemplos com diferença grande:');
    for (const e of exemplosDiferentes) {
      console.log(`  ${e.empName.padEnd(28)} | Lote ${e.lote.padEnd(8)} | Banco: R$ ${e.banco.toFixed(2).padStart(12)} | TI: R$ ${e.ti.toFixed(2).padStart(12)} | Diff: R$ ${e.diff.toFixed(2)}`);
    }
  }
}

main().catch(console.error);
