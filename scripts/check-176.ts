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
  // Buscar lote 176 de Ilha dos Açores
  const { data: lote, error: e1 } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner (nome)')
    .eq('empreendimentos.nome', 'Ilha dos Açores')
    .eq('numero', '176')
    .single();

  console.log('Lote 176 Ilha dos Açores:', lote);
  if (e1) console.log('Erro lote:', e1);

  if (lote) {
    const { data: registro, error: e2 } = await supabase
      .from('registros')
      .select('id, data_recebimento_ri, matricula_url')
      .eq('lote_id', lote.id)
      .single();

    console.log('Registro:', registro);
    if (e2) console.log('Erro registro:', e2);
    console.log('Status:', registro?.data_recebimento_ri ? 'CONCLUÍDO' : 'PENDENTE');
  }

  // Também verificar Aurora 176
  const { data: loteAurora } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner (nome)')
    .eq('empreendimentos.nome', 'Aurora')
    .eq('numero', '176')
    .single();

  if (loteAurora) {
    const { data: regAurora } = await supabase
      .from('registros')
      .select('id, data_recebimento_ri')
      .eq('lote_id', loteAurora.id)
      .single();
    console.log('\nAurora 176:', regAurora?.data_recebimento_ri ? 'CONCLUÍDO' : 'PENDENTE');
  }
}

check();
