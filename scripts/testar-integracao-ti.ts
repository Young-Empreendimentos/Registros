import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Carregar .env.local manualmente
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

// Banco do TI
const SUPABASE_TI_URL = process.env.SUPABASE_TI_URL!;
const SUPABASE_TI_SERVICE_KEY = process.env.SUPABASE_TI_SERVICE_KEY!;
const supabaseTI = createClient(SUPABASE_TI_URL, SUPABASE_TI_SERVICE_KEY);

// Banco principal (Registros)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TIParcela {
  document_number: string;
  cost_center_id: number;
  cost_center_name: string;
  total_paid_net: number;
  units: Array<{ id: number; name: string }>;
}

async function main() {
  console.log('=== Teste de Integração TI ===\n');
  
  // 1. Buscar alguns contratos ativos do banco principal
  console.log('1. Buscando contratos ativos do banco principal...');
  const { data: contratos, error: contratoError } = await supabase
    .from('contratos')
    .select(`
      id,
      numero_contrato,
      valor_ja_pago,
      valor_total,
      lotes(numero, empreendimentos(sienge_id, nome))
    `)
    .eq('ativo', true)
    .limit(5);

  if (contratoError) {
    console.error('Erro ao buscar contratos:', contratoError);
    return;
  }

  console.log(`Encontrados ${contratos?.length || 0} contratos para teste\n`);

  // 2. Para cada contrato, calcular o valor pago usando o banco TI
  for (const contrato of contratos || []) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number; nome: string } } | null;
    if (!lote?.empreendimentos) continue;

    const enterpriseId = lote.empreendimentos.sienge_id;
    const enterpriseName = lote.empreendimentos.nome;
    const documentNumber = contrato.numero_contrato || lote.numero;

    console.log(`\nContrato: ${documentNumber} (${enterpriseName})`);
    console.log(`  Valor Total: R$ ${contrato.valor_total?.toLocaleString('pt-BR')}`);
    console.log(`  Valor Atual (banco): R$ ${(contrato.valor_ja_pago || 0).toLocaleString('pt-BR')}`);

    // Buscar no banco TI usando cost_center_id e units[0].name
    // O cost_center_id deve corresponder ao sienge_id do empreendimento
    // O units[0].name contém o número do lote (ex: "89")
    const normalizedLote = documentNumber.replace(/^(CT\.|ADT\.|NF\.)/i, '').replace(/[A-Z]$/i, '').trim();
    
    let valorTI = 0;
    let parcelasEncontradas = 0;

    // Buscar parcelas pelo cost_center_id
    const { data: parcelas } = await supabaseTI
      .from('sienge_parcelas_receber')
      .select('document_number, cost_center_id, total_paid_net, units')
      .eq('cost_center_id', enterpriseId);

    if (parcelas && parcelas.length > 0) {
      for (const parcela of parcelas as TIParcela[]) {
        // Verificar se o units[0].name corresponde ao número do lote (match exato)
        const unitName = parcela.units?.[0]?.name;
        if (unitName !== normalizedLote && unitName !== documentNumber) continue;
        
        parcelasEncontradas++;
        valorTI += parcela.total_paid_net || 0;
      }
    }

    console.log(`  Parcelas TI: ${parcelasEncontradas}`);
    console.log(`  Valor Calculado TI: R$ ${valorTI.toLocaleString('pt-BR')}`);
    
    const diff = valorTI - (contrato.valor_ja_pago || 0);
    if (Math.abs(diff) > 0.01) {
      console.log(`  Diferença: R$ ${diff.toLocaleString('pt-BR')} ${diff > 0 ? '↑' : '↓'}`);
    } else {
      console.log(`  ✓ Valores iguais`);
    }
  }

  console.log('\n=== Teste concluído ===');
}

main().catch(console.error);
