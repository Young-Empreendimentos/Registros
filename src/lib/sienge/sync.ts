import { createClient } from '@supabase/supabase-js';
import {
  fetchEnterprises,
  fetchUnits,
  fetchSalesContracts,
  fetchCustomer,
  calculatePaidValue,
  getMainCustomer,
  getMainUnitId,
  type SiengeContract,
} from './client';
import { calcularGatilho, isGatilhoAtingido } from '@/lib/calculations';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function runSync(): Promise<{
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  const supabase = getServiceClient();
  const details: Record<string, unknown> = {};
  let registrosAtualizados = 0;

  const { data: logEntry } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', registros_atualizados: 0 })
    .select()
    .single();

  try {
    // 1. Fetch enterprises
    const enterprises = await fetchEnterprises();
    details.enterprises_count = enterprises.length;

    for (const ent of enterprises) {
      await supabase.from('empreendimentos').upsert(
        { sienge_id: ent.id, nome: ent.name },
        { onConflict: 'sienge_id' }
      );
    }

    // 2. Fetch units per enterprise
    let totalUnits = 0;
    for (const ent of enterprises) {
      const units = await fetchUnits(ent.id);
      totalUnits += units.length;

      const { data: empRow } = await supabase
        .from('empreendimentos')
        .select('id')
        .eq('sienge_id', ent.id)
        .single();

      if (!empRow) continue;

      for (const unit of units) {
        await supabase.from('lotes').upsert(
          {
            sienge_unit_id: unit.id,
            numero: unit.name,
            empreendimento_id: empRow.id,
            valor_avista: unit.terrainValue || 0,
          },
          { onConflict: 'sienge_unit_id' }
        );
      }
    }
    details.units_count = totalUnits;

    // 3. Fetch all sales contracts
    const contracts = await fetchSalesContracts();
    details.contracts_count = contracts.length;

    // Group active contracts by unit ID
    const activeContractsByUnit = new Map<number, SiengeContract>();
    for (const contract of contracts) {
      if (contract.situation === 'Cancelado' || contract.cancellationDate) continue;
      const unitId = getMainUnitId(contract);
      if (unitId) {
        const existing = activeContractsByUnit.get(unitId);
        if (!existing || new Date(contract.contractDate) > new Date(existing.contractDate)) {
          activeContractsByUnit.set(unitId, contract);
        }
      }
    }

    // 4. Process each active contract
    for (const [unitSiengeId, contract] of activeContractsByUnit) {
      const mainCustomer = getMainCustomer(contract);
      if (!mainCustomer) continue;

      // Get customer email
      let clienteEmail = '';
      try {
        const customer = await fetchCustomer(mainCustomer.id);
        clienteEmail = customer.email || '';
      } catch {
        // Customer email lookup failed, continue without
      }

      const paidValue = calculatePaidValue(contract);

      // Get lote from DB
      const { data: loteRow } = await supabase
        .from('lotes')
        .select('id')
        .eq('sienge_unit_id', unitSiengeId)
        .single();

      if (!loteRow) continue;

      // Upsert contract
      const { data: contratoRow } = await supabase
        .from('contratos')
        .upsert(
          {
            sienge_contract_id: contract.id,
            lote_id: loteRow.id,
            cliente_nome: mainCustomer.name,
            cliente_email: clienteEmail,
            valor_total: contract.totalSellingValue,
            valor_ja_pago: paidValue,
            data_contrato: contract.contractDate,
            ultima_atualizacao_valor: new Date().toISOString(),
            ativo: true,
          },
          { onConflict: 'sienge_contract_id' }
        )
        .select()
        .single();

      if (!contratoRow) continue;

      // Ensure registro exists for this lote
      const { data: existingRegistro } = await supabase
        .from('registros')
        .select('id, data_gatilho')
        .eq('lote_id', loteRow.id)
        .single();

      if (!existingRegistro) {
        await supabase.from('registros').insert({
          lote_id: loteRow.id,
          contrato_id: contratoRow.id,
        });
      } else {
        // Update contrato_id reference
        const updates: Record<string, unknown> = { contrato_id: contratoRow.id };

        // Check and set data_gatilho if needed
        const gatilho = calcularGatilho(contratoRow);
        const atingido = isGatilhoAtingido(contratoRow, gatilho);
        if (atingido && !existingRegistro.data_gatilho) {
          updates.data_gatilho = new Date().toISOString().split('T')[0];
        }

        await supabase
          .from('registros')
          .update(updates)
          .eq('id', existingRegistro.id);
      }

      registrosAtualizados++;
    }

    // 5. Mark contracts as inactive if no longer in active list
    const activeSiengeIds = Array.from(activeContractsByUnit.values()).map((c) => c.id);
    if (activeSiengeIds.length > 0) {
      await supabase
        .from('contratos')
        .update({ ativo: false })
        .not('sienge_contract_id', 'in', `(${activeSiengeIds.join(',')})`);
    }

    // 6. Create registros for lotes without one
    const { data: lotesWithoutRegistro } = await supabase.rpc('get_lotes_without_registros');
    if (lotesWithoutRegistro) {
      for (const lote of lotesWithoutRegistro) {
        await supabase.from('registros').insert({
          lote_id: lote.id,
          contrato_id: null,
        });
      }
    }

    // Update log
    if (logEntry) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          registros_atualizados: registrosAtualizados,
          detalhes: details,
        })
        .eq('id', logEntry.id);
    }

    return {
      success: true,
      message: `Sincronização concluída. ${registrosAtualizados} registros atualizados.`,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    details.error = errorMessage;

    if (logEntry) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          detalhes: details,
        })
        .eq('id', logEntry.id);
    }

    return {
      success: false,
      message: `Erro na sincronização: ${errorMessage}`,
      details,
    };
  }
}
