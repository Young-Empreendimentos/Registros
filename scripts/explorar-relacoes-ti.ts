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

async function main() {
  // Check contract-customer relationship
  const tables = [
    'sienge_contrato_clientes',
    'sienge_contratos_clientes',
    'sienge_vendas_contratos_clientes',
  ];
  for (const t of tables) {
    const { error } = await supabaseTI.from(t).select('*').limit(1);
    console.log(t, error ? 'NAO EXISTE' : 'EXISTE');
  }

  const { data: cc } = await supabaseTI.from('sienge_contrato_clientes').select('*').limit(2);
  console.log('\nsienge_contrato_clientes:', JSON.stringify(cc, null, 2));

  // Sample active contract with join logic
  const { data: contratos } = await supabaseTI
    .from('sienge_contratos_de_vendas')
    .select('id, number, enterprise_id, enterprise_name, total_selling_value, contract_date, situation, cancellation_date, raw_data')
    .neq('situation', 'Cancelado')
    .is('cancellation_date', null)
    .limit(3);

  console.log('\nContratos ativos (amostra):');
  for (const c of contratos || []) {
    const customers = (c.raw_data as { salesContractCustomers?: Array<{ id: number; main: boolean; name: string }> })?.salesContractCustomers || [];
    const mainCustomer = customers.find(x => x.main && !x.name?.includes('')); // find main
    console.log(`  ${c.number} | ${c.enterprise_name} (${c.enterprise_id}) | cliente raw:`, customers.filter(x => x.main).map(x => x.name));
  }

  // Check sienge_contrato_unidades join
  const { data: cu } = await supabaseTI
    .from('sienge_contrato_unidades')
    .select('contrato_id, unidade_id, main')
    .eq('main', true)
    .limit(5);
  console.log('\nContrato-unidades (main):', cu);

  // Check if sienge_unidades has enterprise info anywhere
  const { data: unidades } = await supabaseTI
    .from('sienge_unidades')
    .select('*')
    .limit(3);
  console.log('\nUnidades TI:', unidades);
}

main().catch(console.error);
