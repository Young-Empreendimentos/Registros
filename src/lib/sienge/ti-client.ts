import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '@/lib/supabase/config';

let _supabaseTI: SupabaseClient | null = null;

/** Cliente lazy — evita erro "supabaseUrl is required" no `next build` sem env. */
export function getSupabaseTI(): SupabaseClient {
  if (!_supabaseTI) {
    _supabaseTI = createClient(getSupabaseUrl(), getSupabaseServiceKey());
  }
  return _supabaseTI;
}

export interface TIReceipt {
  type: string;
  value: number | null;
  extra: number | null;
  netReceipt: number | null;
  date: string | null;
}

/** Soma receipts[].value onde type = 'Recebimento' (valor da parcela, sem juros/multa) */
export function sumValorRecebimentos(receipts: TIReceipt[] | null | undefined): number {
  if (!receipts || !Array.isArray(receipts)) return 0;
  let total = 0;
  for (const receipt of receipts) {
    if (receipt.type === 'Recebimento' && receipt.value) {
      total += receipt.value;
    }
  }
  return total;
}

export interface TIParcela {
  bill_id: number;
  installment_id: number;
  client_id: number;
  client_name: string;
  company_id: number;
  company_name: string;
  document_number: string;
  original_amount: number;
  due_date: string;
  payment_status: string;
  receipts: TIReceipt[];
  total_paid_net: number;
  cost_center_name: string;
  units: Array<{ id: number; name: string }>;
}

export interface ValorPagoContrato {
  documentNumber: string;
  unitName: string;
  costCenterName: string;
  clientName: string;
  valorPago: number;
}

export async function fetchValoresPagosFromTI(): Promise<ValorPagoContrato[]> {
  console.log('Buscando valores pagos do banco TI...');
  
  const allData: TIParcela[] = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await getSupabaseTI()
      .from('sienge_parcelas_receber')
      .select('document_number, client_name, cost_center_name, units, receipts')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Erro ao buscar dados do TI:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...(data as TIParcela[]));
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }

  console.log(`Total de parcelas carregadas: ${allData.length}`);

  const valoresPorContrato = new Map<string, ValorPagoContrato>();

  for (const parcela of allData) {
    const unitName = parcela.units?.[0]?.name || '';
    const key = `${parcela.document_number}|${unitName}`;

    if (!valoresPorContrato.has(key)) {
      valoresPorContrato.set(key, {
        documentNumber: parcela.document_number,
        unitName,
        costCenterName: parcela.cost_center_name || '',
        clientName: parcela.client_name,
        valorPago: 0,
      });
    }

    const contrato = valoresPorContrato.get(key)!;

    contrato.valorPago += sumValorRecebimentos(parcela.receipts);
  }

  const resultado = Array.from(valoresPorContrato.values());
  console.log(`Total de contratos únicos: ${resultado.length}`);
  
  return resultado;
}

export async function fetchValorPagoByUnit(
  costCenterName: string,
  unitName: string
): Promise<number> {
  const { data, error } = await getSupabaseTI()
    .from('sienge_parcelas_receber')
    .select('receipts')
    .eq('cost_center_name', costCenterName)
    .contains('units', [{ name: unitName }]);

  if (error) {
    console.error('Erro ao buscar valor pago:', error);
    return 0;
  }

  let valorPago = 0;
  for (const parcela of data || []) {
    valorPago += sumValorRecebimentos(parcela.receipts as TIReceipt[]);
  }

  return valorPago;
}

// --- Dados cadastrais do banco TI ---

export interface TIContratoVenda {
  id: number;
  number: string;
  enterprise_id: number;
  enterprise_name: string;
  total_selling_value: number;
  contract_date: string;
  situation: string;
  cancellation_date: string | null;
}

export interface TIContratoCliente {
  contrato_id: number;
  cliente_id: number;
  main: boolean;
  spouse: boolean;
}

export interface TICliente {
  id: number;
  name: string;
  email: string | null;
}

export interface TIParcelaReceber {
  document_number: string;
  cost_center_name: string;
  cost_center_id: number;
  receipts: TIReceipt[];
  units: Array<{ id: number; name: string }>;
}

export function isContratoAtivo(contrato: TIContratoVenda): boolean {
  return contrato.situation !== 'Cancelado' && !contrato.cancellation_date;
}

type TISelectQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

async function fetchAllPaginatedTI<T>(
  table: string,
  select: string,
  applyFilter?: (query: TISelectQuery) => TISelectQuery
): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = getSupabaseTI()
      .from(table)
      .select(select)
      .range(offset, offset + pageSize - 1) as TISelectQuery;
    if (applyFilter) query = applyFilter(query);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      all.push(...(data as T[]));
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }

  return all;
}

export async function fetchContratosVendaTI(
  enterpriseIds: number[]
): Promise<TIContratoVenda[]> {
  return fetchAllPaginatedTI<TIContratoVenda>(
    'sienge_contratos_de_vendas',
    'id, number, enterprise_id, enterprise_name, total_selling_value, contract_date, situation, cancellation_date',
    (q) => q.in('enterprise_id', enterpriseIds)
  );
}

export async function fetchContratoClientesTI(): Promise<TIContratoCliente[]> {
  return fetchAllPaginatedTI<TIContratoCliente>(
    'sienge_contrato_clientes',
    'contrato_id, cliente_id, main, spouse'
  );
}

export async function fetchClientesMapTI(): Promise<Map<number, TICliente>> {
  const clientes = await fetchAllPaginatedTI<TICliente>(
    'sienge_clientes',
    'id, name, email'
  );
  const map = new Map<number, TICliente>();
  for (const c of clientes) {
    map.set(c.id, c);
  }
  return map;
}

export function getMainClienteId(
  contratoClientes: TIContratoCliente[],
  contratoId: number
): number | null {
  const principais = contratoClientes.filter(
    (cc) => cc.contrato_id === contratoId && cc.main
  );
  const titular = principais.find((cc) => !cc.spouse);
  return (titular || principais[0])?.cliente_id ?? null;
}

export async function fetchParcelasReceberTI(
  enterpriseIds: number[]
): Promise<TIParcelaReceber[]> {
  const all: TIParcelaReceber[] = [];
  for (const empId of enterpriseIds) {
    const parcelas = await fetchAllPaginatedTI<TIParcelaReceber>(
      'sienge_parcelas_receber',
      'document_number, cost_center_name, cost_center_id, receipts, units',
      (q) => q.eq('cost_center_id', empId)
    );
    all.push(...parcelas);
  }
  return all;
}

export interface TIUnidade {
  id: number;
  name: string;
  enterprise_id: number;
  terrain_value: number;
}

export interface TIContratoUnidade {
  contrato_id: number;
  unidade_id: number;
  main: boolean;
}

/** Unidades/lotes do banco TI (populadas pela ingestão diária) */
export async function fetchUnidadesTI(
  enterpriseIds: number[]
): Promise<TIUnidade[]> {
  const withEnterprise = await fetchAllPaginatedTI<TIUnidade>(
    'sienge_unidades',
    'id, name, enterprise_id, terrain_value',
    (q) => q.in('enterprise_id', enterpriseIds)
  );

  if (withEnterprise.length > 0) {
    return withEnterprise;
  }

  // Fallback: tabela sem enterprise_id (migration pendente) — deriva via contratos
  const unidades = await fetchAllPaginatedTI<{ id: number; name: string }>(
    'sienge_unidades',
    'id, name'
  );
  const links = await fetchContratoUnidadesTI();
  const contratos = await fetchContratosVendaTI(enterpriseIds);
  const contratoEmp = new Map(contratos.map((c) => [c.id, c.enterprise_id]));
  const unitEmp = new Map<number, number>();

  for (const link of links) {
    if (!link.main) continue;
    const empId = contratoEmp.get(link.contrato_id);
    if (empId && enterpriseIds.includes(empId)) {
      unitEmp.set(link.unidade_id, empId);
    }
  }

  return unidades
    .filter((u) => unitEmp.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      enterprise_id: unitEmp.get(u.id)!,
      terrain_value: 0,
    }));
}

export async function fetchContratoUnidadesTI(): Promise<TIContratoUnidade[]> {
  return fetchAllPaginatedTI<TIContratoUnidade>(
    'sienge_contrato_unidades',
    'contrato_id, unidade_id, main'
  );
}

/** Mapa contrato_id → unidade_id principal (banco TI) */
export async function fetchContractUnitLinksTI(): Promise<Map<number, number>> {
  const links = await fetchContratoUnidadesTI();
  const map = new Map<number, number>();
  for (const link of links) {
    if (link.main) map.set(link.contrato_id, link.unidade_id);
  }
  return map;
}
