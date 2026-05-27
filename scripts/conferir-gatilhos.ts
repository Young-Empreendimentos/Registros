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

const DATA_LIMITE = new Date('2024-10-01');

function calcularGatilhoEsperado(valorTotal: number, dataContrato: string): number {
  const data = new Date(dataContrato);
  const percentual = data < DATA_LIMITE ? 0.15 : 0.30;
  return valorTotal * percentual;
}

async function conferir() {
  console.log('Buscando contratos...\n');

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, valor_total, data_contrato, valor_ja_pago, cliente_nome, lote_id')
    .eq('ativo', true)
    .order('data_contrato', { ascending: true });

  if (error) {
    console.error('Erro ao buscar contratos:', error);
    return;
  }

  console.log(`Total de contratos ativos: ${contratos?.length || 0}\n`);

  // Buscar lotes para ter o número
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

  // Separar por período
  const antes = contratos?.filter(c => new Date(c.data_contrato) < DATA_LIMITE) || [];
  const depois = contratos?.filter(c => new Date(c.data_contrato) >= DATA_LIMITE) || [];

  console.log('='.repeat(80));
  console.log('CONTRATOS ANTES DE 01/10/2024 (Gatilho = 15%)');
  console.log('='.repeat(80));
  console.log(`Total: ${antes.length} contratos\n`);

  let errosAntes = 0;
  for (const c of antes) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    const gatilhoEsperado = calcularGatilhoEsperado(c.valor_total, c.data_contrato);
    const gatilhoAtingido = c.valor_ja_pago >= gatilhoEsperado && c.valor_ja_pago > 0;
    
    // Verificar se está usando 15%
    const percentualReal = (gatilhoEsperado / c.valor_total) * 100;
    if (Math.abs(percentualReal - 15) > 0.01) {
      errosAntes++;
      console.log(`[ERRO] Lote ${lote?.numero || 'N/A'} (${empNome})`);
      console.log(`  Data: ${c.data_contrato} | Valor: R$ ${c.valor_total.toFixed(2)}`);
      console.log(`  Gatilho calculado: R$ ${gatilhoEsperado.toFixed(2)} (${percentualReal.toFixed(1)}%)`);
      console.log('');
    }
  }

  if (errosAntes === 0) {
    console.log('✓ Todos os contratos antes de 01/10/2024 estão com gatilho de 15% correto.\n');
  }

  console.log('='.repeat(80));
  console.log('CONTRATOS A PARTIR DE 01/10/2024 (Gatilho = 30%)');
  console.log('='.repeat(80));
  console.log(`Total: ${depois.length} contratos\n`);

  let errosDepois = 0;
  for (const c of depois) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    const gatilhoEsperado = calcularGatilhoEsperado(c.valor_total, c.data_contrato);
    const gatilhoAtingido = c.valor_ja_pago >= gatilhoEsperado && c.valor_ja_pago > 0;
    
    // Verificar se está usando 30%
    const percentualReal = (gatilhoEsperado / c.valor_total) * 100;
    if (Math.abs(percentualReal - 30) > 0.01) {
      errosDepois++;
      console.log(`[ERRO] Lote ${lote?.numero || 'N/A'} (${empNome})`);
      console.log(`  Data: ${c.data_contrato} | Valor: R$ ${c.valor_total.toFixed(2)}`);
      console.log(`  Gatilho calculado: R$ ${gatilhoEsperado.toFixed(2)} (${percentualReal.toFixed(1)}%)`);
      console.log('');
    }
  }

  if (errosDepois === 0) {
    console.log('✓ Todos os contratos a partir de 01/10/2024 estão com gatilho de 30% correto.\n');
  }

  // Resumo
  console.log('='.repeat(80));
  console.log('RESUMO');
  console.log('='.repeat(80));
  console.log(`Contratos antes de 01/10/2024: ${antes.length} (gatilho 15%)`);
  console.log(`Contratos a partir de 01/10/2024: ${depois.length} (gatilho 30%)`);
  console.log('');

  // Mostrar alguns exemplos de cada período
  console.log('Exemplos de contratos ANTES de 01/10/2024:');
  for (const c of antes.slice(0, 3)) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    const gatilho = c.valor_total * 0.15;
    console.log(`  - Lote ${lote?.numero} (${empNome}): Data ${c.data_contrato}, Valor R$ ${c.valor_total.toFixed(2)}, Gatilho R$ ${gatilho.toFixed(2)} (15%)`);
  }

  console.log('\nExemplos de contratos A PARTIR de 01/10/2024:');
  for (const c of depois.slice(0, 3)) {
    const lote = lotesMap.get(c.lote_id);
    const empNome = lote ? empMap.get(lote.empreendimento_id) : 'N/A';
    const gatilho = c.valor_total * 0.30;
    console.log(`  - Lote ${lote?.numero} (${empNome}): Data ${c.data_contrato}, Valor R$ ${c.valor_total.toFixed(2)}, Gatilho R$ ${gatilho.toFixed(2)} (30%)`);
  }

  // Verificar gatilhos atingidos
  console.log('\n' + '='.repeat(80));
  console.log('GATILHOS ATINGIDOS');
  console.log('='.repeat(80));
  
  let atingidosAntes = 0;
  let atingidosDepois = 0;

  for (const c of antes) {
    const gatilho = c.valor_total * 0.15;
    if (c.valor_ja_pago >= gatilho && c.valor_ja_pago > 0) atingidosAntes++;
  }

  for (const c of depois) {
    const gatilho = c.valor_total * 0.30;
    if (c.valor_ja_pago >= gatilho && c.valor_ja_pago > 0) atingidosDepois++;
  }

  console.log(`Contratos antes de 01/10/2024 com gatilho atingido: ${atingidosAntes}/${antes.length}`);
  console.log(`Contratos a partir de 01/10/2024 com gatilho atingido: ${atingidosDepois}/${depois.length}`);
}

conferir().then(() => {
  console.log('\nConferência concluída!');
  process.exit(0);
});
