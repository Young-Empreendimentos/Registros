import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificar() {
  // Verificar alguns lotes específicos
  const lotesExemplo = [
    { emp: 'Ilha dos Açores', num: '10' },
    { emp: 'Ilha dos Açores', num: '100' },
    { emp: 'Aurora', num: '10' },
    { emp: 'Montecarlo ', num: '250' },
  ];

  for (const { emp, num } of lotesExemplo) {
    // Buscar o lote
    const { data: loteData } = await supabase
      .from('lotes')
      .select(`
        id,
        numero,
        empreendimentos!inner (nome)
      `)
      .eq('empreendimentos.nome', emp)
      .eq('numero', num)
      .single();

    if (!loteData) {
      console.log(`Lote ${emp} - ${num}: NÃO ENCONTRADO`);
      continue;
    }

    console.log(`\nLote ${emp} - ${num} (ID: ${loteData.id}):`);

    // Buscar registro para este lote
    const { data: registroData } = await supabase
      .from('registros')
      .select('id, data_recebimento_ri, matricula_url')
      .eq('lote_id', loteData.id)
      .single();

    if (!registroData) {
      console.log(`  Registro: NÃO EXISTE`);
    } else {
      console.log(`  Registro ID: ${registroData.id}`);
      console.log(`  data_recebimento_ri: ${registroData.data_recebimento_ri || 'NULL'}`);
      console.log(`  matricula_url: ${registroData.matricula_url || 'NULL'}`);
    }
  }

  // Contar registros por status
  const { count: totalRegistros } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true });

  const { count: comDataRecebimento } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true })
    .not('data_recebimento_ri', 'is', null);

  const { count: semDataRecebimento } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true })
    .is('data_recebimento_ri', null);

  console.log('\n=== Estatísticas de Registros ===');
  console.log(`Total de registros: ${totalRegistros}`);
  console.log(`Com data_recebimento_ri: ${comDataRecebimento}`);
  console.log(`Sem data_recebimento_ri (pendentes): ${semDataRecebimento}`);
}

verificar();
