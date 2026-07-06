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

async function debug() {
  // Pegar um lote específico que sabemos que existe
  const { data: lote } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner (nome)')
    .eq('empreendimentos.nome', 'Ilha dos Açores')
    .eq('numero', '10')
    .single();

  console.log('Lote encontrado:', lote);

  if (lote) {
    // Buscar registro para este lote
    const { data: registro, error } = await supabase
      .from('registros')
      .select('*')
      .eq('lote_id', lote.id);

    console.log('Registro(s) para este lote:', registro);
    if (error) console.log('Erro:', error);
  }

  // Contar total de lotes e registros
  const { count: totalLotes } = await supabase
    .from('lotes')
    .select('*', { count: 'exact', head: true });

  const { count: totalRegistros } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== Totais ===');
  console.log(`Total de lotes: ${totalLotes}`);
  console.log(`Total de registros: ${totalRegistros}`);

  // Verificar se há lotes sem registros
  const { data: lotesComRegistros } = await supabase
    .from('lotes')
    .select(`
      id,
      registros!inner (id)
    `)
    .limit(5);

  console.log('\nLotes com registros (amostra):', lotesComRegistros?.length);

  // Verificar quantos lotes da Ilha dos Açores têm registros
  const { data: lotesIlha } = await supabase
    .from('lotes')
    .select(`
      id,
      numero,
      empreendimentos!inner (nome)
    `)
    .eq('empreendimentos.nome', 'Ilha dos Açores')
    .limit(10);

  console.log('\n=== Lotes Ilha dos Açores (amostra) ===');
  for (const l of lotesIlha || []) {
    const { data: reg } = await supabase
      .from('registros')
      .select('id, data_recebimento_ri')
      .eq('lote_id', l.id);
    
    const status = reg && reg.length > 0 
      ? (reg[0].data_recebimento_ri ? 'CONCLUÍDO' : 'PENDENTE')
      : 'SEM REGISTRO';
    console.log(`  Lote ${l.numero}: ${status}`);
  }
}

debug();
