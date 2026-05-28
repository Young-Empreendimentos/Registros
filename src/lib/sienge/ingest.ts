import {
  fetchUnits,
  fetchSalesContracts,
  fetchCustomer,
  type SiengeContract,
  type SiengeUnit,
} from './client';
import { getSupabaseTI } from './ti-client';
import { ALLOWED_ENTERPRISE_IDS, ALLOWED_ENTERPRISE_IDS_ARRAY } from './constants';

const BATCH_SIZE = 200;

export type IngestProgressCallback = (event: {
  step: string;
  detail: string;
  percent: number;
}) => void;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function upsertBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<number> {
  let total = 0;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await getSupabaseTI().from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    total += batch.length;
  }
  return total;
}

function mapContratoToRow(contract: SiengeContract) {
  const now = new Date().toISOString();
  return {
    id: contract.id,
    company_id: contract.companyId,
    internal_company_id: contract.internalEnterpriseId,
    company_name: null as string | null,
    enterprise_id: contract.enterpriseId,
    internal_enterprise_id: contract.internalEnterpriseId,
    enterprise_name: contract.enterpriseName,
    receivable_bill_id: null as number | null,
    cancellation_payable_bill_id: null as number | null,
    number: contract.number,
    correction_type: null as string | null,
    situation: contract.situation,
    value: contract.value,
    total_selling_value: contract.totalSellingValue,
    contract_date: contract.contractDate,
    issue_date: null as string | null,
    expected_delivery_date: null as string | null,
    accounting_date: null as string | null,
    creation_date: contract.creationDate,
    last_update_date: contract.lastUpdateDate,
    cancellation_date: contract.cancellationDate,
    synced_at: now,
    raw_data: contract,
  };
}

function mapUnidadeToRow(unit: SiengeUnit) {
  return {
    id: unit.id,
    name: unit.name,
    enterprise_id: unit.enterpriseId,
    terrain_value: unit.terrainValue || 0,
    commercial_stock: unit.commercialStock || null,
    contract_id: unit.contractId,
    synced_at: new Date().toISOString(),
  };
}

async function upsertUnidades(
  rows: Array<Record<string, unknown>>,
  syncedAt: string,
  details: Record<string, unknown>
): Promise<number> {
  if (rows.length === 0) return 0;
  try {
    return await upsertBatches('sienge_unidades', rows, 'id');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('enterprise_id') || msg.includes('terrain_value')) {
      const minimal = rows.map((r) => ({
        id: r.id,
        name: r.name,
        synced_at: syncedAt,
      }));
      details.unidades_migration_pending = true;
      return await upsertBatches('sienge_unidades', minimal, 'id');
    }
    throw err;
  }
}

export async function runSiengeIngest(
  onProgress?: IngestProgressCallback
): Promise<{
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  const details: Record<string, unknown> = {};
  const progress = (step: string, detail: string, percent: number) => {
    onProgress?.({ step, detail, percent });
  };

  try {
    const syncedAt = new Date().toISOString();

    // 1. Contratos de venda + vínculos contrato-unidade e contrato-cliente
    progress('contratos', 'Buscando contratos na API Sienge...', 5);
    const allContracts = await fetchSalesContracts();
    const contracts = allContracts.filter((c) =>
      ALLOWED_ENTERPRISE_IDS.has(c.enterpriseId)
    );
    details.contracts_fetched = allContracts.length;
    details.contracts_filtered = contracts.length;

    const contratoUnidadeRows: Array<{
      contrato_id: number;
      unidade_id: number;
      main: boolean;
      participation_percentage: number;
      synced_at: string;
    }> = [];
    const contratoClienteRows: Array<{
      contrato_id: number;
      cliente_id: number;
      main: boolean;
      spouse: boolean;
    }> = [];
    const clienteIds = new Set<number>();
    const unitStubs = new Map<number, Record<string, unknown>>();
    for (const contract of contracts) {
      for (const unit of contract.salesContractUnits || []) {
        if (!unitStubs.has(unit.id)) {
          unitStubs.set(unit.id, {
            id: unit.id,
            name: unit.name,
            enterprise_id: contract.enterpriseId,
            terrain_value: 0,
            synced_at: syncedAt,
          });
        }
        contratoUnidadeRows.push({
          contrato_id: contract.id,
          unidade_id: unit.id,
          main: unit.main,
          participation_percentage: unit.participationPercentage,
          synced_at: syncedAt,
        });
      }
      for (const customer of contract.salesContractCustomers || []) {
        contratoClienteRows.push({
          contrato_id: contract.id,
          cliente_id: customer.id,
          main: customer.main,
          spouse: customer.spouse,
        });
        clienteIds.add(customer.id);
      }
    }

    // Unidades mínimas ANTES dos vínculos (FK sienge_contrato_unidades → sienge_unidades)
    progress('unidades', `Garantindo ${unitStubs.size} unidades base no Supabase...`, 18);
    details.unidades_stubs = await upsertUnidades(Array.from(unitStubs.values()), syncedAt, details);

    progress('contratos', `Salvando ${contracts.length} contratos no Supabase...`, 25);
    const contratoRows = contracts.map(mapContratoToRow);
    details.contratos_upserted = await upsertBatches(
      'sienge_contratos_de_vendas',
      contratoRows,
      'id'
    );

    progress('vinculos', 'Salvando vínculos contrato-unidade...', 32);
    details.contrato_unidades_upserted = await upsertBatches(
      'sienge_contrato_unidades',
      contratoUnidadeRows,
      'contrato_id,unidade_id'
    );

    // Unidades completas via API (atualiza terrain_value, commercial_stock, etc.)
    progress('unidades', 'Buscando unidades na API Sienge...', 50);
    const allUnits: SiengeUnit[] = [];
    for (let i = 0; i < ALLOWED_ENTERPRISE_IDS_ARRAY.length; i++) {
      const empId = ALLOWED_ENTERPRISE_IDS_ARRAY[i];
      const pct = 50 + Math.round((i / ALLOWED_ENTERPRISE_IDS_ARRAY.length) * 25);
      progress('unidades', `Empreendimento ${empId} (${i + 1}/${ALLOWED_ENTERPRISE_IDS_ARRAY.length})`, pct);
      try {
        const units = await fetchUnits(empId);
        allUnits.push(...units);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'erro';
        details[`units_error_${empId}`] = msg;
      }
    }
    details.units_fetched = allUnits.length;

    progress('unidades', `Atualizando ${allUnits.length} unidades com dados completos...`, 78);
    details.unidades_upserted = await upsertUnidades(
      allUnits.map(mapUnidadeToRow),
      syncedAt,
      details
    );

    // 3. Clientes (detalhes completos via API)
    progress('clientes', `Atualizando ${clienteIds.size} clientes...`, 85);
    const clienteRows: Array<Record<string, unknown>> = [];
    const ids = Array.from(clienteIds);
    let clientesErro = 0;

    for (let i = 0; i < ids.length; i++) {
      if (i % 50 === 0) {
        const pct = 85 + Math.round((i / ids.length) * 12);
        progress('clientes', `Cliente ${i + 1}/${ids.length}`, pct);
      }
      try {
        const customer = await fetchCustomer(ids[i]);
        const hoje = syncedAt.split('T')[0];
        clienteRows.push({
          id: customer.id,
          name: customer.name,
          email: customer.email || customer.emails?.[0]?.email || null,
          person_type: customer.personType || 'Física',
          created_at: customer.createdAt || hoje,
          modified_at: customer.modifiedAt || hoje,
          synced_at: syncedAt,
          raw_data: customer,
        });
      } catch {
        clientesErro++;
      }
    }

    if (clienteRows.length > 0) {
      details.clientes_upserted = await upsertBatches(
        'sienge_clientes',
        clienteRows,
        'id'
      );
    }
    details.clientes_erro = clientesErro;

    // Vínculos contrato-cliente após clientes existirem (FK → sienge_clientes)
    progress('vinculos', 'Salvando vínculos contrato-cliente...', 96);
    details.contrato_clientes_upserted = await upsertBatches(
      'sienge_contrato_clientes',
      contratoClienteRows,
      'contrato_id,cliente_id,spouse'
    );

    progress('concluido', 'Ingestão Sienge → banco Supabase concluída.', 100);

    return {
      success: true,
      message: `Ingestão concluída. ${details.contratos_upserted} contratos, ${details.unidades_upserted} unidades.`,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    details.error = errorMessage;
    progress('erro', errorMessage, -1);
    return {
      success: false,
      message: `Erro na ingestão: ${errorMessage}`,
      details,
    };
  }
}
