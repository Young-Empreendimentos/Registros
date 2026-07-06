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
  // Verificar lote 34 no Morada da Coxilha
  console.log('=== Debug: Lote 34 no Morada da Coxilha ===\n');

  const { data } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('document_number, units, total_paid_net')
    .eq('cost_center_id', 2014)
    .limit(20);

  console.log('Primeiras 20 parcelas do Morada da Coxilha:');
  for (const p of data || []) {
    const unitName = p.units?.[0]?.name || 'N/A';
    console.log(`  ${p.document_number} | unit: ${unitName} | pago: ${p.total_paid_net}`);
  }

  // Verificar unit names únicos
  console.log('\n\nUnits únicas no Morada da Coxilha:');
  const { data: allUnits } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('units')
    .eq('cost_center_id', 2014);

  const uniqueUnits = new Set<string>();
  for (const p of allUnits || []) {
    const unitName = p.units?.[0]?.name;
    if (unitName) uniqueUnits.add(unitName);
  }
  
  console.log([...uniqueUnits].sort((a, b) => parseInt(a) - parseInt(b)).join(', '));

  // Verificar parcelas específicas do lote 34
  console.log('\n\n=== Parcelas do lote 34 especificamente ===');
  const { data: lote34 } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('document_number, units, total_paid_net, installment_number')
    .eq('cost_center_id', 2014)
    .limit(1000);

  const lote34Parcelas = (lote34 || []).filter(p => p.units?.[0]?.name === '34');
  console.log(`Encontradas ${lote34Parcelas.length} parcelas para unit 34:`);
  for (const p of lote34Parcelas.slice(0, 10)) {
    console.log(`  ${p.document_number} | ${p.installment_number} | pago: ${p.total_paid_net}`);
  }

  // Soma do total pago
  const soma = lote34Parcelas.reduce((acc, p) => acc + (p.total_paid_net || 0), 0);
  console.log(`\nTotal pago (lote 34): R$ ${soma.toLocaleString('pt-BR')}`);
}

main().catch(console.error);
