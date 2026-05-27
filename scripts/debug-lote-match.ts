import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lotes } = await supabase
    .from('lotes')
    .select('id, numero, empreendimento_id, empreendimentos(nome)')
    .limit(5);

  console.log('Sample lotes:', JSON.stringify(lotes, null, 2));

  const { data: match } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner(nome)')
    .eq('empreendimentos.nome', 'Parque Lorena l')
    .eq('numero', '1');

  console.log('Match Parque Lorena l + 1:', match);

  const { data: pl2 } = await supabase
    .from('lotes')
    .select('id, numero, empreendimentos!inner(nome)')
    .eq('empreendimentos.nome', 'Parque Lorena II')
    .eq('numero', '1');

  console.log('Parque Lorena II lote 1:', pl2);

  const { data: emps } = await supabase
    .from('empreendimentos')
    .select('nome')
    .ilike('nome', '%Lorena%');
  console.log('Empreendimentos Lorena:', emps);

  const { count } = await supabase.from('lotes').select('*', { count: 'exact', head: true });
  console.log('Total lotes:', count);
}

main();
