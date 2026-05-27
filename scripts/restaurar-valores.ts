import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Carregar .env.local ANTES de qualquer import
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

async function main() {
  console.log('=== Restaurando valores dos contratos ===\n');

  // Import dinâmico após carregar variáveis de ambiente
  const { fetchIncomeData } = await import('../src/lib/sienge/client');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Mapeamento enterpriseId -> companyId
  const ENTERPRISE_COMPANY_MAP: Record<number, number> = {
    1: 1,     // Parque da Guarda Residence
    2: 1,     // Jardim do Parque
    2003: 3,  // Montecarlo
    2004: 4,  // Ilha dos Açores
    2005: 5,  // Aurora
    2007: 7,  // Parque Lorena I
    2009: 9,  // Parque Lorena II
    2010: 10, // Erico Verissimo
    2011: 11, // Algarve
    2014: 14, // Morada da Coxilha
  };

  // 1. Buscar dados de recebimentos da API do Sienge
  console.log('Buscando recebimentos da API Sienge...');
  const startDate = '2020-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  let allIncomeData;
  try {
    allIncomeData = await fetchIncomeData(startDate, endDate);
    console.log(`${allIncomeData.length} recebimentos carregados`);
  } catch (error) {
    console.error('Erro ao buscar recebimentos:', error);
    return;
  }

  // 2. Buscar contratos zerados
  console.log('\nBuscando contratos com valor zerado...');
  const { data: contratos, error: contratoError } = await supabase
    .from('contratos')
    .select('id, numero_contrato, valor_ja_pago, lotes(numero, empreendimentos(sienge_id))')
    .eq('ativo', true)
    .eq('valor_ja_pago', 0);

  if (contratoError) {
    console.error('Erro ao buscar contratos:', contratoError);
    return;
  }

  console.log(`${contratos?.length || 0} contratos com valor zerado encontrados`);

  // 3. Calcular e restaurar valores
  let restaurados = 0;
  for (const contrato of contratos || []) {
    const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number } } | null;
    if (!lote?.empreendimentos?.sienge_id) continue;

    const enterpriseId = lote.empreendimentos.sienge_id;
    const companyId = ENTERPRISE_COMPANY_MAP[enterpriseId];
    const documentNumber = contrato.numero_contrato || lote.numero;

    if (!companyId || !documentNumber) continue;

    // Calcular valor pago usando receipts
    let valorPago = 0;
    const contractItems = allIncomeData.filter(
      item => item.companyId === companyId && item.documentNumber === documentNumber
    );

    for (const item of contractItems) {
      if (item.receipts && item.receipts.length > 0) {
        for (const receipt of item.receipts) {
          if (receipt.operationTypeName === 'Recebimento') {
            valorPago += receipt.grossAmount || 0;
          }
        }
      }
    }

    if (valorPago > 0) {
      await supabase
        .from('contratos')
        .update({ 
          valor_ja_pago: valorPago,
          ultima_atualizacao_valor: new Date().toISOString()
        })
        .eq('id', contrato.id);
      restaurados++;
      
      if (restaurados % 50 === 0) {
        console.log(`Restaurados: ${restaurados}...`);
      }
    }
  }

  console.log(`\n=== Concluído ===`);
  console.log(`${restaurados} contratos restaurados`);
}

main().catch(console.error);
