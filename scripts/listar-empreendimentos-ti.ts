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
  console.log('=== Empreendimentos disponíveis no banco TI ===\n');

  // Buscar cost_center_ids únicos
  const { data, error } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('cost_center_id, cost_center_name')
    .limit(10000);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  // Agrupar por cost_center_id
  const grouped = new Map<number, { name: string; count: number }>();
  for (const row of data || []) {
    const existing = grouped.get(row.cost_center_id);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(row.cost_center_id, { name: row.cost_center_name, count: 1 });
    }
  }

  console.log('ID\t| Nome\t\t\t\t| Parcelas');
  console.log('--------------------------------------------');
  for (const [id, info] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`${id}\t| ${info.name.padEnd(24)}\t| ${info.count}`);
  }

  // Verificar se há parcelas pagas
  console.log('\n\n=== Verificando parcelas com recebimentos ===\n');
  
  const { data: paidData } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('cost_center_name, units, receipts')
    .eq('payment_status', 'paid')
    .limit(10);

  if (paidData && paidData.length > 0) {
    console.log(`Encontradas ${paidData.length} parcelas pagas (amostra):`);
    for (const p of paidData) {
      const unitName = p.units?.[0]?.name || 'N/A';
      console.log(`  - ${p.cost_center_name} | Lote: ${unitName}`);
      console.log(`    Receipts:`, JSON.stringify(p.receipts));
    }
  } else {
    console.log('Nenhuma parcela com status "paid" encontrada.');
  }

  // Verificar parcelas com receipts que têm valor
  console.log('\n\n=== Verificando parcelas com receipts.value > 0 ===\n');
  
  const { data: allData } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('cost_center_name, units, receipts, total_paid_net')
    .gt('total_paid_net', 0)
    .limit(10);

  if (allData && allData.length > 0) {
    console.log(`Encontradas ${allData.length} parcelas com total_paid_net > 0 (amostra):`);
    for (const p of allData) {
      const unitName = p.units?.[0]?.name || 'N/A';
      console.log(`  - ${p.cost_center_name} | Lote: ${unitName} | Total pago: R$ ${p.total_paid_net}`);
    }
  } else {
    console.log('Nenhuma parcela com total_paid_net > 0 encontrada.');
  }
}

main().catch(console.error);
