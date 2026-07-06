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

async function verificar() {
  console.log('Analisando datas de contrato...\n');

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, data_contrato, cliente_nome, valor_total, lote_id')
    .eq('ativo', true)
    .order('data_contrato', { ascending: true });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  // Buscar lotes
  const loteIds = contratos?.map(c => c.lote_id).filter(Boolean) || [];
  const { data: lotes } = await supabase
    .from('lotes')
    .select('id, numero, empreendimento_id')
    .in('id', loteIds);

  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('id, nome');

  const lotesMap = new Map(lotes?.map(l => [l.id, l]) || []);
  const empMap = new Map(empreendimentos?.map(e => [e.id, e.nome]) || []);

  // Agrupar por ano
  const porAno: Record<string, number> = {};
  for (const c of contratos || []) {
    const ano = new Date(c.data_contrato).getFullYear();
    porAno[ano] = (porAno[ano] || 0) + 1;
  }

  console.log('='.repeat(60));
  console.log('DISTRIBUIÇÃO DE CONTRATOS POR ANO');
  console.log('='.repeat(60));
  
  const anos = Object.keys(porAno).sort();
  for (const ano of anos) {
    console.log(`${ano}: ${porAno[ano]} contratos`);
  }

  // Contratos muito antigos (antes de 2020)
  const antigos = contratos?.filter(c => new Date(c.data_contrato).getFullYear() < 2020) || [];
  
  console.log('\n' + '='.repeat(60));
  console.log(`CONTRATOS ANTES DE 2020 (${antigos.length} total)`);
  console.log('='.repeat(60));
  
  for (const c of antigos.slice(0, 20)) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    console.log(`Lote ${lote?.numero || 'N/A'} (${empNome}): ${c.data_contrato} - ${c.cliente_nome}`);
  }

  if (antigos.length > 20) {
    console.log(`... e mais ${antigos.length - 20} contratos antigos`);
  }

  // Contratos recentes (2024 em diante)
  const recentes = contratos?.filter(c => new Date(c.data_contrato).getFullYear() >= 2024) || [];
  
  console.log('\n' + '='.repeat(60));
  console.log(`CONTRATOS DE 2024 EM DIANTE (${recentes.length} total)`);
  console.log('='.repeat(60));
  
  for (const c of recentes) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    console.log(`Lote ${lote?.numero || 'N/A'} (${empNome}): ${c.data_contrato} - ${c.cliente_nome}`);
  }

  // Verificar contratos de outubro/2024 em diante (30%)
  const aposOutubro = contratos?.filter(c => new Date(c.data_contrato) >= new Date('2024-10-01')) || [];
  
  console.log('\n' + '='.repeat(60));
  console.log(`CONTRATOS A PARTIR DE 01/10/2024 - GATILHO 30% (${aposOutubro.length} total)`);
  console.log('='.repeat(60));
  
  for (const c of aposOutubro) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    const gatilho30 = c.valor_total * 0.30;
    console.log(`Lote ${lote?.numero || 'N/A'} (${empNome}): ${c.data_contrato}`);
    console.log(`  Cliente: ${c.cliente_nome}`);
    console.log(`  Valor: R$ ${c.valor_total.toFixed(2)} | Gatilho 30%: R$ ${gatilho30.toFixed(2)}`);
    console.log('');
  }
}

verificar().then(() => {
  console.log('Verificação concluída!');
  process.exit(0);
});
