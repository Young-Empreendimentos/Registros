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

async function listar() {
  const empreendimentos = [
    'Parque Lorena l',
    'Parque Lorena ll', 
    'Parque da Guarda Residence',
    'Jardim do Parque',
    'Montecarlo',
    'Algarve ',
    'Aurora',
    'Ilha dos Açores',
    'Erico Verissimo ',
    'Morada da Coxilha '
  ];

  for (const emp of empreendimentos) {
    const { data } = await supabase
      .from('lotes')
      .select(`
        numero,
        empreendimentos!inner (nome)
      `)
      .eq('empreendimentos.nome', emp)
      .order('numero')
      .limit(20);

    console.log(`\n${emp} (${data?.length || 0} primeiros lotes):`);
    if (data && data.length > 0) {
      const numeros = data.map(l => l.numero).join(', ');
      console.log(`  Lotes: ${numeros}`);
    } else {
      console.log('  Nenhum lote encontrado');
    }
  }
}

listar();
