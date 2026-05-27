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
  // Pegar IDs de alguns lotes que sabemos que existem
  const { data: lotesExemplo } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner (nome)')
    .eq('empreendimentos.nome', 'Ilha dos Açores')
    .in('numero', ['10', '20', '30', '140', '353'])
    .limit(10);

  console.log('Lotes de exemplo:', lotesExemplo);

  if (lotesExemplo && lotesExemplo.length > 0) {
    const ids = lotesExemplo.map(l => l.id);
    console.log('\nIDs:', ids);

    // Buscar registros pendentes
    const { data: pendentes, error: e1 } = await supabase
      .from('registros')
      .select('id, lote_id, data_recebimento_ri')
      .in('lote_id', ids)
      .is('data_recebimento_ri', null);

    console.log('\nRegistros pendentes:', pendentes);
    if (e1) console.log('Erro pendentes:', e1);

    // Buscar registros concluídos
    const { data: concluidos, error: e2 } = await supabase
      .from('registros')
      .select('id, lote_id, data_recebimento_ri')
      .in('lote_id', ids)
      .not('data_recebimento_ri', 'is', null);

    console.log('\nRegistros concluídos:', concluidos);
    if (e2) console.log('Erro concluídos:', e2);

    // Buscar todos os registros desses lotes
    const { data: todos, error: e3 } = await supabase
      .from('registros')
      .select('id, lote_id, data_recebimento_ri')
      .in('lote_id', ids);

    console.log('\nTodos os registros desses lotes:', todos);
    if (e3) console.log('Erro todos:', e3);
  }
}

debug();
