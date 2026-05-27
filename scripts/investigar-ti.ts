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
  console.log('=== Investigando estrutura do banco TI ===\n');

  // 1. Listar cost_center_names únicos
  console.log('1. Cost center names únicos:');
  const { data: costCenters } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('cost_center_name')
    .limit(10000);

  const uniqueCostCenters = [...new Set(costCenters?.map(c => c.cost_center_name) || [])];
  for (const cc of uniqueCostCenters.sort()) {
    const count = costCenters?.filter(c => c.cost_center_name === cc).length || 0;
    console.log(`  - "${cc}": ${count} parcelas`);
  }

  // 2. Buscar exemplos de document_number para alguns empreendimentos
  console.log('\n2. Exemplos de document_number por empreendimento:');
  for (const cc of uniqueCostCenters.slice(0, 5)) {
    const { data: examples } = await supabaseTI
      .from('sienge_parcelas_receber')
      .select('document_number')
      .eq('cost_center_name', cc)
      .limit(5);
    
    const docNumbers = [...new Set(examples?.map(e => e.document_number) || [])];
    console.log(`  ${cc}: ${docNumbers.join(', ')}`);
  }

  // 3. Buscar uma parcela específica para ver a estrutura completa
  console.log('\n3. Exemplo de parcela completa:');
  const { data: sample } = await supabaseTI
    .from('sienge_parcelas_receber')
    .select('*')
    .limit(1);
  
  if (sample?.[0]) {
    console.log(JSON.stringify(sample[0], null, 2));
  }
}

main().catch(console.error);
