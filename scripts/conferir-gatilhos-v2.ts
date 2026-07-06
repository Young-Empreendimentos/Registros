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

async function conferir() {
  console.log('Conferindo gatilhos...\n');

  // Buscar TODOS os contratos ativos
  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, valor_total, data_contrato, valor_ja_pago, cliente_nome')
    .eq('ativo', true);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Total de contratos ativos: ${contratos?.length}\n`);

  // Separar por período
  const antes = contratos?.filter(c => new Date(c.data_contrato) < DATA_LIMITE) || [];
  const depois = contratos?.filter(c => new Date(c.data_contrato) >= DATA_LIMITE) || [];

  console.log('='.repeat(70));
  console.log('RESUMO');
  console.log('='.repeat(70));
  console.log(`Contratos ANTES de 01/10/2024 (gatilho 15%): ${antes.length}`);
  console.log(`Contratos A PARTIR de 01/10/2024 (gatilho 30%): ${depois.length}`);

  // Verificar gatilhos atingidos
  let atingidos15 = 0;
  let atingidos30 = 0;

  for (const c of antes) {
    const gatilho = c.valor_total * 0.15;
    if (c.valor_ja_pago >= gatilho && c.valor_ja_pago > 0) atingidos15++;
  }

  for (const c of depois) {
    const gatilho = c.valor_total * 0.30;
    if (c.valor_ja_pago >= gatilho && c.valor_ja_pago > 0) atingidos30++;
  }

  console.log(`\nGatilhos atingidos (15%): ${atingidos15}/${antes.length}`);
  console.log(`Gatilhos atingidos (30%): ${atingidos30}/${depois.length}`);

  // Detalhar por ano os contratos com 30%
  const porAno: Record<number, number> = {};
  for (const c of depois) {
    const ano = new Date(c.data_contrato).getFullYear();
    porAno[ano] = (porAno[ano] || 0) + 1;
  }

  console.log('\n--- Contratos com gatilho 30% por ano ---');
  for (const ano of Object.keys(porAno).sort()) {
    console.log(`${ano}: ${porAno[Number(ano)]} contratos`);
  }

  // Mostrar alguns exemplos de 2025/2026 com gatilho
  console.log('\n--- Exemplos de contratos 2025/2026 com gatilho 30% ---');
  const exemplos = depois.filter(c => new Date(c.data_contrato).getFullYear() >= 2025).slice(0, 10);
  for (const c of exemplos) {
    const gatilho = c.valor_total * 0.30;
    const atingido = c.valor_ja_pago >= gatilho && c.valor_ja_pago > 0;
    console.log(`${c.data_contrato} - ${c.cliente_nome}`);
    console.log(`  Valor: R$ ${c.valor_total.toFixed(2)} | Gatilho 30%: R$ ${gatilho.toFixed(2)} | Pago: R$ ${c.valor_ja_pago.toFixed(2)} | ${atingido ? '✓ ATINGIDO' : 'Não atingido'}`);
  }
}

conferir().then(() => {
  console.log('\nConferência concluída!');
  process.exit(0);
});
