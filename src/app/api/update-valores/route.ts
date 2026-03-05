import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SIENGE_BASE_URL = process.env.SIENGE_BASE_URL!;
const SIENGE_USERNAME = process.env.SIENGE_USERNAME!;
const SIENGE_PASSWORD = process.env.SIENGE_PASSWORD!;

function getAuthHeader(): string {
  const credentials = Buffer.from(`${SIENGE_USERNAME}:${SIENGE_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

interface IncomeReceipt {
  operationTypeName: string;
  grossAmount: number;
  netAmount: number;
}

interface IncomeItem {
  companyId: number;
  clientId: number;
  billId: number;
  documentNumber: string;
  mainUnit: string;
  originalAmount: number;
  receipts: IncomeReceipt[];
}

interface IncomeResponse {
  data: IncomeItem[];
}

interface SiengeContract {
  id: number;
  number: string;
  enterpriseId: number;
  companyId: number;
}

// Mapeamento enterpriseId -> companyId (baseado na API de enterprises)
const ENTERPRISE_COMPANY_MAP: Record<number, number> = {
  2005: 5,  // Aurora
  2004: 4,  // Ilha dos Açores
  2006: 6,  // Avenida Tiaraju
  2007: 7,  // Parque Lorena I
  2009: 9,  // Parque Lorena II
  2010: 10, // Erico Verissimo
  2011: 11, // Algarve
  2012: 12, // Ramella
  2013: 13, // Guaíba
  2014: 14, // Morada da Coxilha
  2016: 16, // Algarve (RET)
  2017: 17, // Uruguaiana
  2019: 19, // Itaqui
  2022: 22, // EMY
  // Outros
  9: 2,     // Montecarlo
  2003: 3,  // Montecarlo (Alegrete)
};

// Busca todos os recebimentos via bulk-data/income
async function fetchAllIncome(): Promise<IncomeItem[]> {
  const baseUrl = SIENGE_BASE_URL.replace('/public/api/v1', '/public/api/bulk-data/v1');
  
  // Buscar desde 2020 até hoje para pegar todo histórico
  const startDate = '2020-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  const url = `${baseUrl}/income?startDate=${startDate}&endDate=${endDate}&selectionType=P`;
  
  console.log('Buscando recebimentos:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SIENGE bulk-data API error ${response.status}: ${text}`);
  }

  const data: IncomeResponse = await response.json();
  console.log(`Total de recebimentos: ${data.data?.length || 0}`);
  return data.data || [];
}

// Busca detalhes de um contrato
async function fetchContractDetails(contractId: number): Promise<SiengeContract | null> {
  try {
    const response = await fetch(`${SIENGE_BASE_URL}/sales-contracts/${contractId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

// Calcula valor pago real de um contrato (ignora reparcelamentos)
// Usando companyId + documentNumber (que é o número da unidade/lote)
// Usa grossAmount (Vl. Baixa) somando TODOS os receipts de cada parcela
function calculateRealPaidValue(
  incomeItems: IncomeItem[],
  companyId: number,
  unitNumber: string
): number {
  // Filtra pelo companyId e documentNumber (número da unidade)
  const contractItems = incomeItems.filter(
    item => item.companyId === companyId && item.documentNumber === unitNumber
  );
  
  let valorPago = 0;
  
  for (const item of contractItems) {
    if (item.receipts && item.receipts.length > 0) {
      // Soma TODOS os receipts da parcela (pode haver múltiplos recebimentos)
      for (const receipt of item.receipts) {
        if (receipt.operationTypeName === 'Recebimento') {
          // Usa grossAmount = Vl. Baixa do relatório de contas recebidas
          valorPago += receipt.grossAmount || 0;
        }
      }
    }
  }
  
  return valorPago;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar todos os recebimentos do SIENGE
    console.log('Buscando recebimentos do SIENGE...');
    const allIncome = await fetchAllIncome();
    console.log(`Recebimentos carregados: ${allIncome.length}`);

    // 2. Buscar todos os contratos ativos no banco
    const { data: contratos, error } = await supabase
      .from('contratos')
      .select('id, sienge_contract_id, valor_ja_pago')
      .eq('ativo', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Contratos ativos: ${contratos.length}`);

    const results: Array<{
      sienge_id: number;
      company_id: number;
      unit_number: string;
      old_value: number;
      new_value: number;
      updated: boolean;
    }> = [];

    let updated = 0;
    let errors = 0;
    let noData = 0;

    // 3. Para cada contrato, buscar os detalhes e calcular valor pago
    for (let i = 0; i < contratos.length; i++) {
      const contrato = contratos[i];
      
      // Buscar detalhes do contrato no SIENGE
      const details = await fetchContractDetails(contrato.sienge_contract_id);
      
      if (!details) {
        errors++;
        // Delay para evitar rate limit
        await sleep(200);
        continue;
      }

      // Obter companyId do mapeamento ou direto do contrato
      const companyId = ENTERPRISE_COMPANY_MAP[details.enterpriseId] || details.companyId;
      const unitNumber = details.number; // O número do contrato é o mesmo da unidade
      
      if (!companyId || !unitNumber) {
        noData++;
        await sleep(200);
        continue;
      }

      // Calcular valor pago real (sem reparcelamentos)
      const valorLiquido = calculateRealPaidValue(allIncome, companyId, unitNumber);
      const oldValue = contrato.valor_ja_pago || 0;

      // Só atualiza se encontrou algum valor ou se já tinha valor anterior
      if (Math.abs(valorLiquido - oldValue) > 0.01) {
        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('contratos')
          .update({ valor_ja_pago: valorLiquido })
          .eq('id', contrato.id);

        if (!updateError) {
          updated++;
          results.push({
            sienge_id: contrato.sienge_contract_id,
            company_id: companyId,
            unit_number: unitNumber,
            old_value: oldValue,
            new_value: valorLiquido,
            updated: true,
          });
        } else {
          errors++;
        }
      }

      // Delay para evitar rate limit (200ms entre requisições)
      await sleep(200);

      // Log progresso a cada 50 contratos
      if ((i + 1) % 50 === 0) {
        console.log(`Processados ${i + 1}/${contratos.length} contratos... ${updated} atualizados`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Atualização concluída. ${updated} contratos atualizados, ${errors} erros, ${noData} sem dados.`,
      total: contratos.length,
      updated,
      errors,
      noData,
      changes: results.slice(0, 50), // Limita a resposta
    });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Update failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Update valores endpoint. Use POST to trigger.' });
}
