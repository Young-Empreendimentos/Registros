import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  console.log('Buscando logs com status running...');
  
  const { data: logs, error } = await supabase
    .from('sync_logs')
    .select('id, started_at, status')
    .eq('status', 'running');

  if (error) {
    console.error('Erro ao buscar logs:', error);
    return;
  }

  console.log('Logs em andamento encontrados:', logs?.length || 0);

  if (logs && logs.length > 0) {
    for (const log of logs) {
      console.log('Corrigindo log:', log.id, 'de', log.started_at);
      
      const { error: updateError } = await supabase
        .from('sync_logs')
        .update({ 
          status: 'error', 
          finished_at: new Date().toISOString()
        })
        .eq('id', log.id);
      
      if (updateError) {
        console.error('Erro ao atualizar log', log.id, updateError);
      } else {
        console.log('Log', log.id, 'marcado como erro com sucesso!');
      }
    }
  } else {
    console.log('Nenhum log travado encontrado.');
  }
}

fix().then(() => {
  console.log('Concluído!');
  process.exit(0);
});
