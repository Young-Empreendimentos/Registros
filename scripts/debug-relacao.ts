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

async function debug() {
  // Buscar lote 176 de Ilha dos Açores com registro
  const { data: lote, error } = await supabase
    .from('lotes')
    .select(`
      id,
      numero,
      empreendimentos!inner (nome),
      registros (id, data_recebimento_ri)
    `)
    .eq('empreendimentos.nome', 'Ilha dos Açores')
    .eq('numero', '176')
    .single();

  console.log('Lote com registros:', JSON.stringify(lote, null, 2));
  if (error) console.log('Erro:', error);

  // Tentar buscar de outra forma
  const { data: lote2 } = await supabase
    .from('lotes')
    .select('id, numero')
    .eq('numero', '176')
    .limit(1)
    .single();

  if (lote2) {
    const { data: reg } = await supabase
      .from('registros')
      .select('*')
      .eq('lote_id', lote2.id)
      .single();
    
    console.log('\nRegistro separado:', JSON.stringify(reg, null, 2));
  }
}

debug();
