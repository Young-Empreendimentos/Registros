import { createClient } from '@supabase/supabase-js';
import {
  fetchEnterprises,
  fetchUnits,
  fetchSalesContracts,
  fetchCustomer,
  fetchIncomeData,
  getMainCustomer,
  getMainUnitId,
  type SiengeContract,
  type SiengeIncomeItem,
} from './client';
import { calcularGatilho, isGatilhoAtingido } from '@/lib/calculations';

// Empreendimentos permitidos (sienge_id -> nome):
// 1    - Parque da Guarda Residence
// 2    - Jardim do Parque
// 2003 - Montecarlo
// 2004 - Ilha dos Açores
// 2005 - Aurora
// 2007 - Parque Lorena l
// 2009 - Parque Lorena II
// 2010 - Erico Verissimo
// 2011 - Algarve
// 2014 - Morada da Coxilha
const ALLOWED_ENTERPRISE_IDS = new Set([1, 2, 2003, 2004, 2005, 2007, 2009, 2010, 2011, 2014]);

// Mapeamento enterpriseId -> companyId (para busca de recebimentos)
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

// Calcula valor pago real baseado nos recebimentos (ignora reparcelamentos)
// Usa grossAmount (Vl. Baixa do relatório SIENGE) somando TODOS os receipts de cada parcela
function calculateRealPaidValue(
  incomeItems: SiengeIncomeItem[],
  companyId: number,
  unitNumber: string
): number {
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

export type ProgressCallback = (event: {
  step: string;
  detail: string;
  percent: number;
}) => void;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function runSync(
  onProgress?: ProgressCallback
): Promise<{
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  const supabase = getServiceClient();
  const details: Record<string, unknown> = {};
  let registrosAtualizados = 0;

  const progress = (step: string, detail: string, percent: number) => {
    onProgress?.({ step, detail, percent });
  };

  const { data: logEntry } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', registros_atualizados: 0 })
    .select()
    .single();

  try {
    // 1. Fetch enterprises
    progress('empreendimentos', 'Carregando empreendimentos do SIENGE...', 2);
    const enterprises = await fetchEnterprises();

    const relevantEnterprises = enterprises.filter((ent) => 
      ALLOWED_ENTERPRISE_IDS.has(ent.id)
    );
    details.enterprises_count = relevantEnterprises.length;

    for (const ent of relevantEnterprises) {
      await supabase.from('empreendimentos').upsert(
        { sienge_id: ent.id, nome: ent.name },
        { onConflict: 'sienge_id' }
      );
    }
    progress('empreendimentos', `${relevantEnterprises.length} empreendimentos carregados`, 8);

    // 2. Fetch units per enterprise
    let totalUnits = 0;
    const skippedEnterprises: number[] = [];
    const enterprisesWithUnits = relevantEnterprises;

    for (let i = 0; i < enterprisesWithUnits.length; i++) {
      const ent = enterprisesWithUnits[i];
      const pct = 8 + Math.round((i / enterprisesWithUnits.length) * 25);
      progress('unidades', `Carregando unidades: ${ent.name} (${i + 1}/${enterprisesWithUnits.length})`, pct);

      let units;
      try {
        units = await fetchUnits(ent.id);
      } catch {
        skippedEnterprises.push(ent.id);
        continue;
      }
      totalUnits += units.length;

      const { data: empRow } = await supabase
        .from('empreendimentos')
        .select('id')
        .eq('sienge_id', ent.id)
        .single();

      if (!empRow) continue;

      for (const unit of units) {
        // Extrair apenas o número do lote (remove prefixos como "Lote", "lote", etc.)
        let numeroLote = unit.name;
        
        // Se contém "Lote" seguido de número, extrai só o número
        const loteMatch = numeroLote.match(/[Ll]ote\s*(\d+)/);
        if (loteMatch) {
          numeroLote = loteMatch[1];
        } else {
          // Se é apenas um número, mantém
          const onlyNumber = numeroLote.match(/^(\d+)$/);
          if (onlyNumber) {
            numeroLote = onlyNumber[1];
          } else {
            // Se não é um lote válido (ex: "The Ecko 38"), pula
            const hasNumber = numeroLote.match(/\d+/);
            if (!hasNumber || numeroLote.match(/[A-Za-z]{2,}/)) {
              // Contém texto que não é "Lote" - provavelmente não é um lote válido
              continue;
            }
            // Extrai o número se houver
            numeroLote = hasNumber[0];
          }
        }
        
        await supabase.from('lotes').upsert(
          {
            sienge_unit_id: unit.id,
            numero: numeroLote,
            empreendimento_id: empRow.id,
            valor_avista: unit.terrainValue || 0,
          },
          { onConflict: 'sienge_unit_id' }
        );
      }
    }
    details.units_count = totalUnits;
    if (skippedEnterprises.length > 0) {
      details.skipped_enterprises = skippedEnterprises;
    }
    progress('unidades', `${totalUnits} unidades carregadas`, 35);

    // 3. Fetch all sales contracts
    progress('contratos', 'Carregando contratos de venda do SIENGE...', 37);
    let contracts: SiengeContract[] = [];
    try {
      contracts = await fetchSalesContracts();
    } catch (err) {
      details.contracts_error = err instanceof Error ? err.message : 'Erro ao buscar contratos';
    }
    details.contracts_count = contracts.length;
    progress('contratos', `${contracts.length} contratos carregados`, 42);

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

    const activeContracts = Array.from(activeContractsByUnit.entries());
    details.active_contracts = activeContracts.length;
    progress('processando', `Processando ${activeContracts.length} contratos ativos...`, 45);

    // Buscar todos os recebimentos via bulk-data/income
    progress('recebimentos', 'Carregando recebimentos do SIENGE (bulk-data)...', 46);
    let allIncomeData: SiengeIncomeItem[] = [];
    try {
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];
      allIncomeData = await fetchIncomeData(startDate, endDate);
      details.income_count = allIncomeData.length;
    } catch (err) {
      details.income_error = err instanceof Error ? err.message : 'Erro ao buscar recebimentos';
    }
    progress('recebimentos', `${allIncomeData.length} recebimentos carregados`, 48);

    // Pre-load existing emails from DB to avoid redundant API calls
    const { data: existingContratos } = await supabase
      .from('contratos')
      .select('sienge_contract_id, cliente_email');
    const emailCache = new Map<number, string>();
    for (const c of existingContratos || []) {
      if (c.cliente_email) {
        emailCache.set(c.sienge_contract_id, c.cliente_email);
      }
    }

    // Deduplicate customer IDs to minimize API calls
    const customerEmailMap = new Map<number, string>();
    const uniqueCustomerIds: number[] = [];
    for (const [, contract] of activeContracts) {
      const mainCustomer = getMainCustomer(contract);
      if (!mainCustomer) continue;
      const cached = emailCache.get(contract.id);
      if (cached) {
        customerEmailMap.set(mainCustomer.id, cached);
      } else if (!customerEmailMap.has(mainCustomer.id) && !uniqueCustomerIds.includes(mainCustomer.id)) {
        uniqueCustomerIds.push(mainCustomer.id);
      }
    }

    // Fetch only unknown customer emails
    if (uniqueCustomerIds.length > 0) {
      progress('emails', `Buscando e-mails de ${uniqueCustomerIds.length} clientes novos...`, 48);
      for (let i = 0; i < uniqueCustomerIds.length; i++) {
        const custId = uniqueCustomerIds[i];
        if (i % 10 === 0) {
          const pct = 48 + Math.round((i / uniqueCustomerIds.length) * 20);
          progress('emails', `Buscando e-mails: ${i + 1}/${uniqueCustomerIds.length}`, pct);
        }
        try {
          const customer = await fetchCustomer(custId);
          customerEmailMap.set(custId, customer.email || '');
        } catch {
          customerEmailMap.set(custId, '');
        }
      }
    }
    progress('emails', 'E-mails carregados', 70);

    // 4. Process each active contract
    for (let i = 0; i < activeContracts.length; i++) {
      const [unitSiengeId, contract] = activeContracts[i];
      if (i % 20 === 0) {
        const pct = 70 + Math.round((i / activeContracts.length) * 22);
        progress('salvando', `Salvando contratos: ${i + 1}/${activeContracts.length}`, pct);
      }

      const mainCustomer = getMainCustomer(contract);
      if (!mainCustomer) continue;

      const clienteEmail = customerEmailMap.get(mainCustomer.id) || '';
      
      // Calcular valor pago usando recebimentos reais (ignora reparcelamentos)
      const companyId = ENTERPRISE_COMPANY_MAP[contract.enterpriseId] || contract.companyId;
      const unitNumber = contract.number;
      const paidValue = allIncomeData.length > 0 
        ? calculateRealPaidValue(allIncomeData, companyId, unitNumber)
        : 0;

      const { data: loteRow } = await supabase
        .from('lotes')
        .select('id')
        .eq('sienge_unit_id', unitSiengeId)
        .single();

      if (!loteRow) continue;

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
            numero_contrato: contract.number,
          },
          { onConflict: 'sienge_contract_id' }
        )
        .select()
        .single();

      if (!contratoRow) continue;

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
        const updates: Record<string, unknown> = { contrato_id: contratoRow.id };
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
    progress('salvando', `${registrosAtualizados} contratos processados`, 93);

    // 5. Mark contracts as inactive if no longer in active list
    progress('finalizando', 'Atualizando status dos contratos...', 94);
    const activeSiengeIds = Array.from(activeContractsByUnit.values()).map((c) => c.id);
    if (activeSiengeIds.length > 0) {
      await supabase
        .from('contratos')
        .update({ ativo: false })
        .not('sienge_contract_id', 'in', `(${activeSiengeIds.join(',')})`);
    }

    // 6. Create registros for lotes without one
    progress('finalizando', 'Criando registros para novos lotes...', 96);
    const { data: lotesWithoutRegistro } = await supabase.rpc('get_lotes_without_registros');
    if (lotesWithoutRegistro) {
      for (const lote of lotesWithoutRegistro) {
        await supabase.from('registros').insert({
          lote_id: lote.id,
          contrato_id: null,
        });
      }
      details.new_registros = lotesWithoutRegistro.length;
    }

    // 7. Atualizar valores pagos de TODOS os contratos existentes usando bulk-data/income
    // Isso garante que mesmo contratos que não vieram na busca de sales-contracts sejam atualizados
    if (allIncomeData.length > 0) {
      progress('valores', 'Atualizando valores pagos de todos os contratos...', 97);
      
      const { data: todosContratos } = await supabase
        .from('contratos')
        .select('id, sienge_contract_id, valor_ja_pago, numero_contrato, lotes(numero, empreendimentos(sienge_id))')
        .eq('ativo', true);

      let valoresAtualizados = 0;
      
      if (todosContratos) {
        for (const contrato of todosContratos) {
          const lote = contrato.lotes as { numero: string; empreendimentos: { sienge_id: number } } | null;
          if (!lote?.empreendimentos?.sienge_id) continue;
          
          const enterpriseId = lote.empreendimentos.sienge_id;
          const companyId = ENTERPRISE_COMPANY_MAP[enterpriseId];
          // Usa numero_contrato (ex: "221B") se disponível, senão usa numero do lote (ex: "221")
          const documentNumber = (contrato as { numero_contrato?: string }).numero_contrato || lote.numero;
          
          if (!companyId || !documentNumber) continue;
          
          const valorCalculado = calculateRealPaidValue(allIncomeData, companyId, documentNumber);
          const valorAtual = contrato.valor_ja_pago || 0;
          
          // Só atualiza se houver diferença significativa
          if (Math.abs(valorCalculado - valorAtual) > 0.01) {
            await supabase
              .from('contratos')
              .update({ 
                valor_ja_pago: valorCalculado,
                ultima_atualizacao_valor: new Date().toISOString()
              })
              .eq('id', contrato.id);
            valoresAtualizados++;
          }
        }
      }
      
      details.valores_atualizados = valoresAtualizados;
      progress('valores', `${valoresAtualizados} valores de contratos atualizados`, 99);
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

    progress('concluido', `Sincronização concluída! ${registrosAtualizados} registros atualizados.`, 100);

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

    progress('erro', `Erro: ${errorMessage}`, -1);

    return {
      success: false,
      message: `Erro na sincronização: ${errorMessage}`,
      details,
    };
  }
}
