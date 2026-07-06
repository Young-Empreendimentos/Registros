import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Carregar .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Verificando contratos com valor zerado ===\n');

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, numero_contrato, valor_total, valor_ja_pago, ultima_atualizacao_valor, lotes(numero, empreendimentos(nome))')
    .eq('ativo', true)
    .eq('valor_ja_pago', 0)
    .gt('valor_total', 0);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Total de contratos ativos com valor_ja_pago = 0: ${contratos?.length || 0}`);

  // Verificar quais foram atualizados hoje
  const hoje = new Date().toISOString().split('T')[0];
  const atualizadosHoje = contratos?.filter(c => 
    c.ultima_atualizacao_valor?.startsWith(hoje)
  ) || [];

  console.log(`\nContratos zerados HOJE (${hoje}): ${atualizadosHoje.length}`);

  if (atualizadosHoje.length > 0) {
    console.log('\nExemplos:');
    for (const c of atualizadosHoje.slice(0, 10)) {
      const lote = c.lotes as { numero: string; empreendimentos: { nome: string } } | null;
      console.log(`  - ${lote?.empreendimentos?.nome} | Lote ${c.numero_contrato || lote?.numero} | Valor total: R$ ${c.valor_total}`);
    }
    if (atualizadosHoje.length > 10) {
      console.log(`  ... e mais ${atualizadosHoje.length - 10} contratos`);
    }
  }
}

main().catch(console.error);
