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
  // Buscar alguns lotes para ver o formato
  const { data: lotesData } = await supabase
    .from('lotes')
    .select(`
      id,
      numero,
      empreendimentos!inner (
        nome
      )
    `)
    .limit(50);

  console.log('Exemplos de lotes no banco:');
  lotesData?.forEach(lote => {
    const emp = lote.empreendimentos as { nome: string };
    console.log(`  ${emp.nome} - Lote "${lote.numero}"`);
  });

  // Verificar nomes dos empreendimentos
  const { data: emps } = await supabase
    .from('empreendimentos')
    .select('nome');
  
  console.log('\nEmpreendimentos no banco:');
  emps?.forEach(e => console.log(`  "${e.nome}"`));
}

verificar();
