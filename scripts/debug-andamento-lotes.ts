import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pending = [
  { emp: 'Montecarlo', lote: '183' },
  { emp: 'Erico Verissimo', lote: '70' },
  { emp: 'Erico Verissimo', lote: '255' },
  { emp: 'Erico Verissimo', lote: '69' },
  { emp: 'Erico Verissimo', lote: '250' },
  { emp: 'Erico Verissimo', lote: '205' },
];

async function main() {
  const { data: emps } = await supabase
    .from('empreendimentos')
    .select('nome')
    .or('nome.ilike.%Erico%,nome.ilike.%Monte%');
  console.log('Empreendimentos:', emps);

  for (const p of pending) {
    const { data } = await supabase
      .from('lotes')
      .select('id, numero, empreendimentos(nome)')
      .eq('numero', p.lote);
    const match = (data || []).filter((d) => {
      const n = (d.empreendimentos as { nome: string })?.nome || '';
      return n.toLowerCase().includes(p.emp.split(' ')[0].toLowerCase());
    });
    console.log(p, '->', match);
  }
}

main();
