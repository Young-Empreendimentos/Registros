import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Buscar registros concluídos HOJE
  const { data: hoje, count } = await supabase
    .from('registros')
    .select('id, lotes!inner(numero, empreendimentos!inner(nome))', { count: 'exact' })
    .eq('data_recebimento_ri', '2026-05-15')
    .limit(20);

  console.log(`Registros concluídos HOJE (15/05/2026): ${count}`);
  console.log('\nExemplos:');
  hoje?.forEach(r => {
    const lote = r.lotes as any;
    console.log(`  ${lote.empreendimentos.nome} - Lote ${lote.numero}`);
  });

  // Estatísticas
  const { count: total } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true });

  const { count: concluidos } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true })
    .not('data_recebimento_ri', 'is', null);

  const { count: pendentes } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true })
    .is('data_recebimento_ri', null);

  console.log('\n=== Estatísticas ===');
  console.log(`Total: ${total}`);
  console.log(`Concluídos: ${concluidos}`);
  console.log(`Pendentes: ${pendentes}`);
}

check();
