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
  documentNumber: string;
  originalAmount: number;
  receipts: IncomeReceipt[];
}

interface IncomeResponse {
  data: IncomeItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.secret !== process.env.SYNC_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sienge_contract_id, company_id, unit_number } = body;

    if (!sienge_contract_id || !company_id || !unit_number) {
      return NextResponse.json({ 
        error: 'Missing required fields: sienge_contract_id, company_id, unit_number' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar recebimentos
    const baseUrl = SIENGE_BASE_URL.replace('/public/api/v1', '/public/api/bulk-data/v1');
    const startDate = '2020-01-01';
    const endDate = new Date().toISOString().split('T')[0];
    
    const url = `${baseUrl}/income?startDate=${startDate}&endDate=${endDate}&selectionType=P&companyId=${company_id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `SIENGE API error: ${text}` }, { status: 500 });
    }

    const data: IncomeResponse = await response.json();
    
    // Filtrar pelo documentNumber
    const contractItems = data.data.filter(
      item => item.companyId === company_id && item.documentNumber === unit_number
    );

    // Usa grossAmount (Vl. Baixa) somando TODOS os receipts de cada parcela
    let valorPago = 0;
    for (const item of contractItems) {
      if (item.receipts && item.receipts.length > 0) {
        // Soma TODOS os receipts da parcela (pode haver múltiplos recebimentos)
        for (const receipt of item.receipts) {
          if (receipt.operationTypeName === 'Recebimento') {
            valorPago += receipt.grossAmount || 0;
          }
        }
      }
    }

    // Atualizar no banco
    const { data: updated, error } = await supabase
      .from('contratos')
      .update({ valor_ja_pago: valorPago })
      .eq('sienge_contract_id', sienge_contract_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sienge_contract_id,
      company_id,
      unit_number,
      recebimentos_encontrados: contractItems.length,
      valor_baixa: valorPago,
      contrato_atualizado: updated,
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
  return NextResponse.json({ status: 'Update contrato endpoint. Use POST with sienge_contract_id, company_id, unit_number.' });
}
