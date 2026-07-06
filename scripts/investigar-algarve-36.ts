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

async function main() {
  console.log('=== Investigando Algarve Lote 36 no banco TI ===\n');

  // 1. Buscar TODAS as parcelas do Algarve (sem limite)
  console.log('1. Buscando TODAS as parcelas do Algarve (cost_center_id = 2011)...');
  
  const allParcelas = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabaseTI
      .from('sienge_parcelas_receber')
      .select('document_number, units, total_paid_net, installment_number, payment_status, cost_center_name')
      .eq('cost_center_id', 2011)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Erro:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allParcelas.push(...data);
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }
  
  console.log(`Total de parcelas do Algarve: ${allParcelas.length}\n`);

  // 2. Agrupar por unit name
  const porLote = new Map<string, { parcelas: number; totalPago: number; documentNumbers: Set<string> }>();
  
  for (const p of allParcelas) {
    const unitName = p.units?.[0]?.name || 'N/A';
    if (!porLote.has(unitName)) {
      porLote.set(unitName, { parcelas: 0, totalPago: 0, documentNumbers: new Set() });
    }
    const info = porLote.get(unitName)!;
    info.parcelas++;
    info.totalPago += p.total_paid_net || 0;
    info.documentNumbers.add(p.document_number);
  }

  console.log('Lotes encontrados (ordenados):');
  const sortedLotes = [...porLote.entries()].sort((a, b) => {
    const numA = parseInt(a[0]) || 0;
    const numB = parseInt(b[0]) || 0;
    return numA - numB;
  });
  
  for (const [lote, info] of sortedLotes) {
    console.log(`  Lote "${lote}": ${info.parcelas} parcelas | Total pago: R$ ${info.totalPago.toLocaleString('pt-BR')} | Docs: ${[...info.documentNumbers].join(', ')}`);
  }

  // 3. Buscar especificamente lote 36
  console.log('\n\n2. Buscando especificamente lote "36":');
  const lote36 = allParcelas.filter(p => p.units?.[0]?.name === '36');
  console.log(`Encontradas ${lote36.length} parcelas para unit "36"`);

  // Verificar variações: "036", "36A", etc
  console.log('\n3. Buscando variações do 36:');
  const variacoes = allParcelas.filter(p => {
    const name = p.units?.[0]?.name || '';
    return name.includes('36');
  });
  
  for (const p of variacoes.slice(0, 20)) {
    console.log(`  unit: "${p.units?.[0]?.name}" | doc: ${p.document_number} | parcela: ${p.installment_number} | status: ${p.payment_status} | pago: R$ ${p.total_paid_net}`);
  }

  // 4. Buscar por document_number contendo "36"
  console.log('\n4. Buscando por document_number contendo "36":');
  const doc36 = allParcelas.filter(p => 
    p.document_number?.includes('.36') || 
    p.document_number === 'CT.36' ||
    p.document_number === 'ADT.36'
  );
  for (const p of doc36.slice(0, 20)) {
    console.log(`  doc: ${p.document_number} | unit: "${p.units?.[0]?.name}" | parcela: ${p.installment_number} | pago: R$ ${p.total_paid_net}`);
  }

  // 5. Verificar TODOS os document_numbers únicos
  console.log('\n5. Document numbers únicos do Algarve:');
  const docs = [...new Set(allParcelas.map(p => p.document_number))].sort();
  console.log(docs.join(', '));
}

main().catch(console.error);
