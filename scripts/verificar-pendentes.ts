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
  // Buscar todos os registros pendentes (sem data_recebimento_ri)
  const { data: registrosPendentes } = await supabase
    .from('registros')
    .select(`
      id,
      lote_id,
      lotes!inner (
        numero,
        empreendimentos!inner (nome)
      )
    `)
    .is('data_recebimento_ri', null)
    .limit(100);

  console.log('=== Exemplos de registros PENDENTES (sem data_recebimento_ri) ===\n');
  
  // Agrupar por empreendimento
  const porEmpreendimento: Record<string, string[]> = {};
  
  for (const reg of registrosPendentes || []) {
    const lote = reg.lotes as { numero: string, empreendimentos: { nome: string } };
    const emp = lote.empreendimentos.nome;
    if (!porEmpreendimento[emp]) {
      porEmpreendimento[emp] = [];
    }
    if (porEmpreendimento[emp].length < 10) {
      porEmpreendimento[emp].push(lote.numero);
    }
  }

  for (const [emp, numeros] of Object.entries(porEmpreendimento)) {
    console.log(`${emp}: ${numeros.sort().join(', ')}...`);
  }

  // Contar por empreendimento
  console.log('\n=== Contagem total de pendentes por empreendimento ===\n');
  
  const emps = ['Ilha dos Açores', 'Aurora', 'Montecarlo ', 'Parque Lorena l', 'Parque Lorena ll', 'Algarve ', 'Erico Verissimo ', 'Morada da Coxilha ', 'Parque da Guarda Residence', 'Jardim do Parque'];
  
  for (const emp of emps) {
    const { count } = await supabase
      .from('registros')
      .select(`
        id,
        lotes!inner (
          empreendimentos!inner (nome)
        )
      `, { count: 'exact', head: true })
      .is('data_recebimento_ri', null)
      .eq('lotes.empreendimentos.nome', emp);
    
    if (count && count > 0) {
      console.log(`${emp}: ${count} registros pendentes`);
    }
  }
}

verificar();
