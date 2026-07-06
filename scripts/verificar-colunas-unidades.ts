import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabaseTI = createClient(
  process.env.SUPABASE_TI_URL!,
  process.env.SUPABASE_TI_SERVICE_KEY!
);

async function main() {
  const { data, error } = await supabaseTI
    .from('sienge_unidades')
    .select('id, enterprise_id, terrain_value')
    .limit(1);

  if (error) {
    console.log('Migration pendente:', error.message);
  } else {
    console.log('Colunas OK:', data?.[0]);
  }
}

main();
