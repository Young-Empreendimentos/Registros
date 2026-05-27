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

interface TIIncomeData {
  document_number: string;
  cost_center_name: string;
  cost_center_id: number;
  total_paid_net: number;
  units: Array<{ id: number; name: string }>;
}

function extrairNumeroLote(input: string | undefined | null): string {
  if (!input) return '';
  const match = input.match(/\d+/);
  if (!match) return '';
  return String(parseInt(match[0], 10));
}

function extrairNumeroComLetra(input: string | undefined | null): string {
  if (!input) return '';
  const match = input.match(/(\d+)([A-Z]?)/i);
  if (!match) return '';
  const num = String(parseInt(match[1], 10));
  const letra = (match[2] || '').toUpperCase();
  return num + letra;
}

// Mesma função do sync.ts
function calculateRealPaidValueFromTI(
  incomeItems: TIIncomeData[],
  enterpriseId: number,
  ...loteCandidatos: (string | undefined | null)[]
): number {
  let idAlvoComLetra: string | null = null;
  let idAlvoSemLetra: string | null = null;
  
  for (const candidato of loteCandidatos) {
    const id = extrairNumeroComLetra(candidato);
    if (!id) continue;
    if (/[A-Z]$/i.test(id)) {
      if (!idAlvoComLetra) idAlvoComLetra = id;
    } else {
      if (!idAlvoSemLetra) idAlvoSemLetra = id;
    }
  }
  
  const idAlvo = idAlvoComLetra || idAlvoSemLetra;
  if (!idAlvo) return 0;
  
  const numAlvo = idAlvo.replace(/[A-Z]$/i, '');
  const temLetra = /[A-Z]$/i.test(idAlvo);

  const itensDoLote = incomeItems.filter(item => {
    if (item.cost_center_id !== enterpriseId) return false;
    if (!item.units || item.units.length === 0) return false;
    return extrairNumeroLote(item.units[0]?.name) === numAlvo;
  });
  
  if (itensDoLote.length === 0) return 0;
  
  const matchExato = itensDoLote.filter(item => 
    extrairNumeroComLetra(item.document_number) === idAlvo
  );
  
  if (matchExato.length > 0) {
    let valorPago = 0;
    for (const item of matchExato) {
      valorPago += item.total_paid_net || 0;
    }
    return valorPago;
  }
  
  const temOutrosComLetra = itensDoLote.some(item => {
    const docId = extrairNumeroComLetra(item.document_number);
    return /[A-Z]$/i.test(docId);
  });
  
  if (temOutrosComLetra && temLetra) {
    return 0;
  }
  
  let valorPago = 0;
  for (const item of itensDoLote) {
    valorPago += item.total_paid_net || 0;
  }
  return valorPago;
}

async function main() {
  console.log('=== Validação V2 (com lógica correta) ===\n');

  // Carregar dados do TI
  console.log('Carregando dados do TI...');
  const allParcelas: TIIncomeData[] = [];
  const empreendimentosIds = [1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014];
  
  for (const empId of empreendimentosIds) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabaseTI
        .from('sienge_parcelas_receber')
        .select('document_number, cost_center_id, cost_center_name, units, total_paid_net')
        .eq('cost_center_id', empId)
        .range(offset, offset + 999);
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allParcelas.push(...(data as TIIncomeData[]));
        offset += 1000;
        if (data.length < 1000) hasMore = false;
      }
    }
  }
  console.log(`Total parcelas: ${allParcelas.length}\n`);

  // Buscar contratos
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
  console.log(`Contratos ativos: ${contratos.length}\n`);

  // Comparar usando a MESMA lógica que a sync usa
  let iguais = 0;
  let diferentes = 0;
  let diferentesGrandes = 0;
  let zerosNoTI = 0;
  const exemplosDiferentes: Array<{ empName: string; numContrato: string; loteNum: string; banco: number; ti: number; diff: number }> = [];

  for (const contrato of contratos) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;
    
    const enterpriseId = lote.empreendimentos.sienge_id;
    const valorBanco = contrato.valor_ja_pago || 0;
    
    // Usa a mesma lógica do sync
    const valorTI = calculateRealPaidValueFromTI(
      allParcelas,
      enterpriseId,
      contrato.numero_contrato,
      lote.numero
    );
    
    if (valorTI === 0) {
      zerosNoTI++;
      if (exemplosDiferentes.length < 30) {
        exemplosDiferentes.push({
          empName: lote.empreendimentos.nome,
          numContrato: contrato.numero_contrato || '',
          loteNum: lote.numero,
          banco: valorBanco,
          ti: 0,
          diff: -valorBanco,
        });
      }
      continue;
    }
    
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
            numContrato: contrato.numero_contrato || '',
            loteNum: lote.numero,
            banco: valorBanco,
            ti: valorTI,
            diff: valorTI - valorBanco,
          });
        }
      }
    }
  }

  console.log(`✓ Contratos com valor IGUAL ao TI: ${iguais}`);
  console.log(`~ Diferença pequena (<R$ 10): ${diferentes - diferentesGrandes}`);
  console.log(`✗ Diferença grande (>R$ 10): ${diferentesGrandes}`);
  console.log(`0 Sem dados no TI (valor TI = 0): ${zerosNoTI}`);
  
  if (exemplosDiferentes.length > 0) {
    console.log('\nExemplos com diferença grande:');
    for (const e of exemplosDiferentes) {
      console.log(`  ${e.empName.padEnd(28)} | numero_contrato="${e.numContrato}" lote="${e.loteNum}" | Banco: R$ ${e.banco.toFixed(2).padStart(12)} | TI: R$ ${e.ti.toFixed(2).padStart(12)} | Diff: R$ ${e.diff.toFixed(2)}`);
    }
  }
}

main().catch(console.error);
