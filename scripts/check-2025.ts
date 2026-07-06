import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Buscando contratos de 2025 e 2026...\n');

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, data_contrato, cliente_nome, ativo')
    .gte('data_contrato', '2025-01-01')
    .order('data_contrato', { ascending: true });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('Contratos encontrados de 2025 em diante:', contratos?.length || 0);
  
  if (contratos && contratos.length > 0) {
    for (const c of contratos) {
      console.log(`${c.data_contrato} - ${c.cliente_nome} (ativo: ${c.ativo})`);
    }
  } else {
    console.log('\n*** NENHUM CONTRATO DE 2025 OU 2026 ENCONTRADO! ***');
    console.log('Isso pode indicar que a sincronização não está trazendo contratos novos.');
  }

  // Total de contratos no banco
  const { count } = await supabase
    .from('contratos')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal de contratos no banco:', count);

  // Data do contrato mais recente
  const { data: maisRecente } = await supabase
    .from('contratos')
    .select('data_contrato, cliente_nome')
    .order('data_contrato', { ascending: false })
    .limit(5);

  console.log('\n5 contratos mais recentes:');
  for (const c of maisRecente || []) {
    console.log(`  ${c.data_contrato} - ${c.cliente_nome}`);
  }
}

check().then(() => process.exit(0));
