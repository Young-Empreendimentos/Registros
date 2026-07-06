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
  // Buscar empreendimentos com Montecarlo no nome
  const { data: emps } = await supabase
    .from('empreendimentos')
    .select('id, nome')
    .ilike('nome', '%monte%');
  
  console.log('Empreendimentos com "Monte":');
  emps?.forEach(e => console.log(`  ID: ${e.id}, Nome: "${e.nome}"`));

  // Verificar se há lotes para cada um
  for (const emp of emps || []) {
    const { data: lotes, count } = await supabase
      .from('lotes')
      .select('numero', { count: 'exact' })
      .eq('empreendimento_id', emp.id)
      .limit(10);
    
    console.log(`\n  Lotes de "${emp.nome}" (${count} total):`);
    if (lotes && lotes.length > 0) {
      console.log(`    ${lotes.map(l => l.numero).join(', ')}...`);
    }
  }
}

verificar();
