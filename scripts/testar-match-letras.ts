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

async function carregarTodosDoEmp(empId: number): Promise<TIIncomeData[]> {
  const result: TIIncomeData[] = [];
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
      result.push(...(data as TIIncomeData[]));
      offset += 1000;
      if (data.length < 1000) hasMore = false;
    }
  }
  return result;
}

async function main() {
  console.log('=== Teste de match com letras ===\n');

  console.log('Carregando Ilha dos Açores...');
  const allData = await carregarTodosDoEmp(2004);
  console.log(`Total: ${allData.length} parcelas\n`);
  
  // Encontrar todos os document_numbers do lote 190
  const lote190Items = allData.filter(d => extrairNumeroLote(d.units?.[0]?.name) === '190');
  
  console.log(`Items com unit "190": ${lote190Items.length}`);
  const docsUnicos = new Set(lote190Items.map(d => d.document_number));
  console.log('Document numbers únicos:', [...docsUnicos].join(', '));
  
  // Total por document_number
  const totaisPorDoc = new Map<string, number>();
  for (const item of lote190Items) {
    totaisPorDoc.set(item.document_number, (totaisPorDoc.get(item.document_number) || 0) + (item.total_paid_net || 0));
  }
  console.log('\nTotal por document_number:');
  for (const [doc, total] of totaisPorDoc) {
    console.log(`  ${doc}: R$ ${total.toFixed(2)}`);
  }
  
  // Testar match com a nova função
  console.log('\n\n=== Testes ===');
  
  console.log('\n1. numero_contrato="190A", lote.numero="190":');
  const v190A = calculateRealPaidValueFromTI(allData, 2004, "190A", "190");
  console.log(`  Resultado: R$ ${v190A.toFixed(2)}`);
  
  console.log('\n2. numero_contrato="190B", lote.numero="190":');
  const v190B = calculateRealPaidValueFromTI(allData, 2004, "190B", "190");
  console.log(`  Resultado: R$ ${v190B.toFixed(2)}`);
  
  console.log('\n3. numero_contrato="190", lote.numero="190" (sem letra):');
  const v190 = calculateRealPaidValueFromTI(allData, 2004, "190", "190");
  console.log(`  Resultado: R$ ${v190.toFixed(2)}`);
  
  // Testar Algarve 36 (sem letra)
  console.log('\n\nCarregando Algarve...');
  const algData = await carregarTodosDoEmp(2011);
  console.log(`Total: ${algData.length} parcelas\n`);
  
  console.log('\n4. Algarve numero_contrato="36", lote.numero="36":');
  const vAlg36 = calculateRealPaidValueFromTI(algData, 2011, "36", "36");
  console.log(`  Resultado: R$ ${vAlg36.toFixed(2)}`);
}

main().catch(console.error);
