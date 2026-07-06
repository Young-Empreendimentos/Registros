import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabaseTI = createClient(
  process.env.SUPABASE_TI_URL!,
  process.env.SUPABASE_TI_SERVICE_KEY!
);

const TABLES = [
  'sienge_clientes',
  'sienge_contratos_de_vendas',
  'sienge_contrato_unidades',
  'sienge_unidades',
  'sienge_empreendimentos',
];

async function main() {
  for (const table of TABLES) {
    console.log(`\n=== ${table} ===`);
    const { data, error, count } = await supabaseTI
      .from(table)
      .select('*', { count: 'exact' })
      .limit(2);

    if (error) {
      console.log('ERRO:', error.message);
      continue;
    }

    console.log(`Total: ${count}`);
    if (data?.[0]) {
      console.log('Colunas:', Object.keys(data[0]).join(', '));
      console.log('Exemplo:', JSON.stringify(data[0], null, 2));
    }
  }
}

main().catch(console.error);
